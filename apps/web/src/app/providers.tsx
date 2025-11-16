"use client";

import { ReactNode, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { AuthProvider } from "@/contexts/auth-context";

interface ProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
