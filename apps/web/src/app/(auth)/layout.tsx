import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2" suppressHydrationWarning>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center font-medium gap-2">
            <Image src="/logo.png" alt="Logo" width={24} height={24} />
            <div className="flex flex-col leading-tight">
              Omnichannel
              <span className="text-xs font-medium text-neutral-500">
                by Entrefine
              </span>
            </div>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-xs flex-col gap-6">{children}</div>
        </div>
      </div>
      <div className="bg-primary relative hidden lg:block border-l">
        <div className="flex h-full items-end justify-end p-10">
          <p className="text-primary-foreground text-lg italic text-right max-w-md">
            &quot;Selamat datang di masa depan manajemen omni-channel yang
            efisien.&quot;
          </p>
        </div>
        {/* <Image
          src="/placeholder.svg"
          alt="Image"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        /> */}
      </div>
    </div>
  );
}
