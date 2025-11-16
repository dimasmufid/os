from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import exceptions as fastapi_users_exceptions
from fastapi_users.authentication import Strategy
from fastapi_users.manager import BaseUserManager
from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_config
from src.auth.dependencies import ROLE_PRIORITY, get_current_user, resolve_tenant
from src.auth.models import Invitation, Tenant, User, UserTenant, UserTenantRole
from src.auth.schemas import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordCheckRequest,
    ForgotPasswordCheckResponse,
    GoogleAuthRequest,
    InvitationCreate,
    InvitationLookup,
    InviteMemberRequest,
    MessageResponse,
    OrganizationCreateRequest,
    OrganizationInvitationPublic,
    OrganizationMemberPublic,
    OrganizationMembershipPublic,
    OrganizationMemberUser,
    SigninRequest,
    SignupRequest,
    SwitchOrganizationRequest,
    TenantCreate,
    UpdateProfileRequest,
    UserCreate,
    UserPublic,
)
from src.auth.security.refresh import RefreshTokenNotFound, RefreshTokenService
from src.auth.services.invitations import InvitationService
from src.auth.services.tenants import TenantService
from src.auth.services.users import (
    UserManager,
    auth_backend,
    current_active_user,
    get_user_manager,
)
from src.config import settings
from src.database import get_async_session
from src.utils import generate_unique_slug

router = APIRouter(tags=["auth-app"])
logger = logging.getLogger(__name__)


async def _serialize_user_public(
    *,
    user: User,
    session: AsyncSession,
) -> UserPublic:
    return await get_current_user(user=user, session=session)


def _serialize_invitation_public(
    invitation: Invitation,
) -> OrganizationInvitationPublic:
    return OrganizationInvitationPublic(
        id=invitation.id,
        organization_id=invitation.tenant_id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        token=invitation.token,
        invited_at=invitation.created_at,
        expires_at=invitation.expires_at,
        invited_by=invitation.invited_by_user_id,
        accepted_at=None,
    )


def _serialize_member(
    membership: UserTenant,
    member: User,
) -> OrganizationMemberPublic:
    return OrganizationMemberPublic(
        id=member.id,
        role=membership.role,
        is_default=membership.is_default,
        joined_at=membership.created_at,
        user=OrganizationMemberUser(
            id=member.id,
            email=member.email,
            full_name=member.full_name,
            profile_picture=member.profile_picture,
            created_at=member.created_at,
            updated_at=member.updated_at or member.created_at,
        ),
    )


def _derive_default_organization_name(
    display_name: str | None,
    email: str,
) -> str:
    if display_name and display_name.strip():
        return f"{display_name.strip()}'s Workspace"

    local_part = email.split("@", 1)[0].strip()
    if local_part:
        return f"{local_part.title()}'s Workspace"
    return "New Workspace"


async def _build_auth_response(
    *,
    user: User,
    request: Request,
    session: AsyncSession,
    user_manager: BaseUserManager[User, UUID],
    strategy: Strategy[User, UUID],
    status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    access_token = await strategy.write_token(user)
    user_public = await _serialize_user_public(user=user, session=session)

    issued_at = datetime.now(UTC)
    refresh_token = getattr(request.state, "refresh_token", None)
    refresh_expires_at = getattr(request.state, "refresh_expires_at", None)
    refresh_expires_in: int | None = None
    if isinstance(refresh_expires_at, datetime):
        delta_seconds = int((refresh_expires_at - issued_at).total_seconds())
        if delta_seconds > 0:
            refresh_expires_in = delta_seconds
    if refresh_expires_in is None:
        refresh_expires_in = auth_config.refresh_cookie_max_age
    response = JSONResponse(
        status_code=status_code,
        content=AuthResponse(
            user=user_public,
            token_type="bearer",
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=auth_config.access_cookie_max_age,
            expires_at=issued_at + auth_config.access_token_ttl,
            refresh_expires_in=refresh_expires_in,
            refresh_expires_at=refresh_expires_at
            or issued_at + auth_config.refresh_token_ttl,
        ).model_dump(mode="json"),
    )

    # Attach access and refresh cookies
    auth_backend.transport._set_login_cookie(response, access_token)  # type: ignore[attr-defined] # noqa: SLF001
    await user_manager.on_after_login(user, request, response)
    return response


@router.get("/profile", response_model=UserPublic, name="auth:profile")
async def get_profile(user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return user


@router.patch("/profile", response_model=UserPublic, name="auth:update_profile")
async def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> UserPublic:
    if payload.full_name is not None:
        normalized = payload.full_name.strip()
        user.full_name = normalized or None

    if payload.profile_picture is not None:
        picture = payload.profile_picture.strip()
        user.profile_picture = picture or None

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return await _serialize_user_public(user=user, session=session)


@router.post(
    "/password/forgot/check",
    response_model=ForgotPasswordCheckResponse,
    name="auth:forgot_password_check",
)
async def check_forgot_password_email(
    payload: ForgotPasswordCheckRequest,
    session: AsyncSession = Depends(get_async_session),
) -> ForgotPasswordCheckResponse:
    normalized_email = payload.email.strip().lower()
    result = await session.execute(
        select(User.id).where(func.lower(User.email) == normalized_email)
    )
    exists = result.scalar_one_or_none() is not None
    message = (
        "Silahkan periksa email Anda untuk instruksi reset password."
        if exists
        else "Email tidak terdaftar."
    )
    return ForgotPasswordCheckResponse(exists=exists, message=message)


@router.post(
    "/password/change",
    response_model=MessageResponse,
    name="auth:change_password",
)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
) -> JSONResponse:
    valid, new_hash = user_manager.password_helper.verify_and_update(
        payload.current_password,
        user.hashed_password,
    )
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid current password.",
        )
    if new_hash:
        user.hashed_password = new_hash

    await user_manager.validate_password(payload.new_password, user)
    user.hashed_password = user_manager.password_helper.hash(payload.new_password)

    session.add(user)

    refresh_service = RefreshTokenService(session)
    await refresh_service.revoke_all(user.id)
    await session.commit()

    response_body = MessageResponse(message="Password updated successfully.")
    response = JSONResponse(content=response_body.model_dump())
    auth_backend.transport._set_logout_cookie(response)  # type: ignore[attr-defined] # noqa: SLF001
    response.delete_cookie(
        key=auth_config.refresh_cookie_name,
        domain=auth_config.cookie_domain,
        path="/",
    )
    return response


@router.post(
    "/google",
    response_model=AuthResponse,
    name="auth:signin_google",
)
async def signin_with_google(
    payload: GoogleAuthRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    logger.info(
        "Google sign-in attempt from origin=%s invite_token=%s",
        request.headers.get("origin"),
        payload.invite_token,
    )
    if not settings.OAUTH_GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured.",
        )

    try:
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.OAUTH_GOOGLE_CLIENT_ID,
        )
    except (ValueError, google_exceptions.GoogleAuthError) as exc:
        logger.exception("Failed to verify Google credential")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credential.",
        ) from exc

    email: str | None = id_info.get("email")
    if not email:
        logger.warning("Google credential missing email address")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not provide an email address.",
        )

    account_id: str | None = id_info.get("sub")
    if not account_id:
        logger.warning("Google credential missing subject identifier")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential is missing a subject identifier.",
        )

    raw_email_verified = id_info.get("email_verified", False)
    email_verified = (
        raw_email_verified
        if isinstance(raw_email_verified, bool)
        else str(raw_email_verified).lower() == "true"
    )
    display_name = (
        id_info.get("name")
        or id_info.get("given_name")
        or id_info.get("family_name")
        or None
    )
    picture = id_info.get("picture")

    logger.info(
        "Google credential verified email=%s sub=%s verified=%s",
        email,
        account_id,
        email_verified,
    )

    user_pre_exists = True
    user: User
    try:
        user = await user_manager.get_by_email(email)
    except fastapi_users_exceptions.UserNotExists:
        user_pre_exists = False
        password = user_manager.password_helper.generate()
        user_create = UserCreate(
            email=email,
            password=password,
            full_name=display_name,
            profile_picture=picture,
        )
        user = await user_manager.create(
            user_create,
            safe=True,
            request=request,
        )
        logger.info(
            "Created new user %s from Google credential",
            user.id,
        )

    should_commit = False
    if email_verified and not user.is_verified:
        user.is_verified = True
        should_commit = True
    if display_name and user.full_name != display_name:
        user.full_name = display_name
        should_commit = True
    if picture and user.profile_picture != picture:
        user.profile_picture = picture
        should_commit = True

    if should_commit:
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.debug("Updated profile details from Google for user=%s", user.id)

    membership_changed = False
    if payload.invite_token:
        invitation_service = InvitationService(session)
        await invitation_service.accept_invitation(
            token=payload.invite_token,
            user=user,
        )
        membership_changed = True
        logger.info(
            "Accepted invitation via Google sign-in user=%s token=%s",
            user.id,
            payload.invite_token,
        )
    elif not user_pre_exists:
        requested_organization = (payload.organization_name or "").strip()
        organization_name = (
            requested_organization
            if requested_organization
            else _derive_default_organization_name(display_name, email)
        )
        tenant_service = TenantService(session)
        slug = await generate_unique_slug(session, organization_name)
        await tenant_service.create_tenant(
            user,
            TenantCreate(name=organization_name, slug=slug),
        )
        membership_changed = True
        logger.info(
            "Created default tenant name=%s slug=%s for new Google user=%s",
            organization_name,
            slug,
            user.id,
        )

    if membership_changed:
        await session.refresh(
            user,
            attribute_names=["tenants"],
        )
        if user.tenants and not any(
            membership.is_default for membership in user.tenants
        ):
            primary_membership = user.tenants[0]
            primary_membership.is_default = True
            session.add(primary_membership)
            await session.commit()
            await session.refresh(
                user,
                attribute_names=["tenants"],
            )
            logger.debug("Set default tenant for user=%s", user.id)

    await session.refresh(user)
    logger.info("Google sign-in succeeded for user=%s", user.id)

    return await _build_auth_response(
        user=user,
        request=request,
        session=session,
        user_manager=user_manager,
        strategy=strategy,
    )


@router.post(
    "/signin",
    response_model=AuthResponse,
    name="auth:signin",
)
async def signin(
    payload: SigninRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    credentials = OAuth2PasswordRequestForm(
        username=payload.email,
        password=payload.password,
        scope="",
    )
    user = await user_manager.authenticate(credentials)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password.",
        )

    return await _build_auth_response(
        user=user,
        request=request,
        session=session,
        user_manager=user_manager,
        strategy=strategy,
    )


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    name="auth:signup",
)
async def signup(
    payload: SignupRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    profile_picture = (
        payload.profile_picture.strip() if payload.profile_picture else None
    )
    user_create = UserCreate(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        profile_picture=profile_picture,
    )

    try:
        user = await user_manager.create(user_create, safe=True, request=request)
    except fastapi_users_exceptions.UserAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        ) from exc
    except fastapi_users_exceptions.InvalidPasswordException as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.reason,
        ) from exc

    # Respect optional verification flag when provided
    if payload.is_verified is not None:
        user.is_verified = payload.is_verified
    session.add(user)

    if payload.invite_token:
        invitation_service = InvitationService(session)
        await invitation_service.accept_invitation(
            token=payload.invite_token,
            user=user,
        )
    else:
        if not payload.organization_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Organization name is required when no invite token is " "provided."
                ),
            )
        org_name = payload.organization_name.strip()
        if not org_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization name cannot be empty.",
            )

        tenant_service = TenantService(session)
        slug = await generate_unique_slug(session, org_name)
        await tenant_service.create_tenant(
            user,
            TenantCreate(name=org_name, slug=slug),
        )

    await session.refresh(user)
    return await _build_auth_response(
        user=user,
        request=request,
        session=session,
        user_manager=user_manager,
        strategy=strategy,
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/organizations",
    response_model=list[OrganizationMembershipPublic],
    name="auth:list_organizations",
)
async def list_organizations(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[OrganizationMembershipPublic]:
    user_public = await _serialize_user_public(user=user, session=session)
    return user_public.memberships


@router.post(
    "/organizations",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    name="auth:create_organization",
)
async def create_organization(
    payload: OrganizationCreateRequest,
    request: Request,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    tenant_service = TenantService(session)
    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization name cannot be empty.",
        )
    slug = await generate_unique_slug(session, name)
    await tenant_service.create_tenant(
        user,
        TenantCreate(name=name, slug=slug),
    )
    await session.refresh(user)
    return await _build_auth_response(
        user=user,
        request=request,
        session=session,
        user_manager=user_manager,
        strategy=strategy,
        status_code=status.HTTP_201_CREATED,
    )


@router.post(
    "/organizations/select",
    response_model=AuthResponse,
    name="auth:switch_organization",
)
async def switch_organization(
    payload: SwitchOrganizationRequest,
    request: Request,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    await resolve_tenant(tenant_id=payload.organization_id, user=user, session=session)

    tenant_service = TenantService(session)
    await tenant_service.make_default(user.id, payload.organization_id)

    refresh_cookie = request.cookies.get(auth_config.refresh_cookie_name)
    if refresh_cookie:
        refresh_service = RefreshTokenService(session)
        try:
            refresh_session = await refresh_service.get_active_session(refresh_cookie)
            refresh_session.default_tenant_id = payload.organization_id
            session.add(refresh_session)
            await session.flush()
        except RefreshTokenNotFound:
            pass

    await session.refresh(user)
    return await _build_auth_response(
        user=user,
        request=request,
        session=session,
        user_manager=user_manager,
        strategy=strategy,
    )


@router.get(
    "/organizations/{organization_id}/members",
    response_model=list[OrganizationMemberPublic],
    name="auth:list_members",
)
async def list_members(
    organization_id: UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[OrganizationMemberPublic]:
    await resolve_tenant(tenant_id=organization_id, user=user, session=session)

    statement = (
        select(UserTenant, User)
        .join(User, UserTenant.user_id == User.id)
        .where(UserTenant.tenant_id == organization_id)
        .order_by(UserTenant.created_at.asc())
    )
    result = await session.execute(statement)
    return [
        _serialize_member(membership, member) for membership, member in result.all()
    ]


@router.delete(
    "/organizations/{organization_id}/members/{member_id}",
    response_model=MessageResponse,
    name="auth:remove_member",
)
async def remove_member(
    organization_id: UUID,
    member_id: UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> MessageResponse:
    context = await resolve_tenant(
        tenant_id=organization_id,
        user=user,
        session=session,
    )

    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to remove members.",
        )

    if member_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the organization.",
        )

    membership = await session.get(UserTenant, (member_id, organization_id))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found.",
        )

    if membership.role == UserTenantRole.OWNER:
        owners_statement = select(UserTenant).where(
            UserTenant.tenant_id == organization_id,
            UserTenant.role == UserTenantRole.OWNER,
            UserTenant.user_id != member_id,
        )
        owners_result = await session.execute(owners_statement)
        if owners_result.scalars().first() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last owner of the organization.",
            )

    await session.delete(membership)
    await session.commit()
    return MessageResponse(message="Member removed.")


@router.get(
    "/organizations/{organization_id}/invitations",
    response_model=list[OrganizationInvitationPublic],
    name="auth:list_invitations",
)
async def list_invitations(
    organization_id: UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[OrganizationInvitationPublic]:
    context = await resolve_tenant(
        tenant_id=organization_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view invitations.",
        )

    service = InvitationService(session)
    invitations = await service.list_invitations_for_tenant(organization_id)
    return [_serialize_invitation_public(invitation) for invitation in invitations]


@router.post(
    "/organizations/{organization_id}/invite",
    response_model=OrganizationInvitationPublic,
    status_code=status.HTTP_201_CREATED,
    name="auth:invite_member",
)
async def invite_member(
    organization_id: UUID,
    payload: InviteMemberRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> OrganizationInvitationPublic:
    context = await resolve_tenant(
        tenant_id=organization_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to invite members.",
        )

    service = InvitationService(session)
    invitation = await service.create_invitation(
        inviter=user,
        payload=InvitationCreate(
            email=payload.email,
            tenant_id=organization_id,
            role=payload.role,
        ),
    )
    return _serialize_invitation_public(invitation)


@router.delete(
    "/organizations/{organization_id}/invitations/{invitation_id}",
    response_model=MessageResponse,
    name="auth:cancel_invitation",
)
async def cancel_invitation(
    organization_id: UUID,
    invitation_id: UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> MessageResponse:
    context = await resolve_tenant(
        tenant_id=organization_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to cancel invitations.",
        )

    service = InvitationService(session)
    invitation = await service.get_invitation_by_id(invitation_id)
    if invitation.tenant_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found for this organization.",
        )

    await service.revoke_invitation(invitation)
    return MessageResponse(message="Invitation cancelled.")


@router.get(
    "/invitations/{token}",
    response_model=InvitationLookup,
    name="auth:get_invitation",
)
async def get_invitation(
    token: str,
    session: AsyncSession = Depends(get_async_session),
) -> InvitationLookup:
    service = InvitationService(session)
    invitation = await service.get_invitation_from_token(token)

    tenant = await session.get(Tenant, invitation.tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found for this invitation.",
        )

    normalized_email = invitation.email.lower()
    existing_user_result = await session.execute(
        select(User.id).where(func.lower(User.email) == normalized_email)
    )
    user_exists = existing_user_result.scalars().first() is not None

    invitation_data = _serialize_invitation_public(invitation)
    return InvitationLookup(
        **invitation_data.model_dump(),
        organization_name=tenant.name,
        user_exists=user_exists,
    )
