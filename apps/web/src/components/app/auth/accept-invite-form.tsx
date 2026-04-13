"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/custom/password-input";
import { Badge } from "@/components/ui/badge";
import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import * as z from "zod";
import { api } from "@packages/backend/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import { Spinner } from "@/components/ui/spinner";
import { ROLE_LABELS } from "@/utils/roles";

const formSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export function AcceptInviteForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const inviteType = searchParams.get("type"); // "player" or null (admin/team)

  // Handle missing token immediately — don't spin forever
  if (!token) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-2xl font-bold text-destructive">
                Invalid Invitation
              </h1>
              <p className="text-muted-foreground">
                This invitation link is invalid. No invitation token was
                provided.
              </p>
              <Button variant="outline" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If type=player, render the player-specific accept flow
  if (inviteType === "player") {
    return <AcceptPlayerInviteForm token={token} className={className} {...props} />;
  }

  // Otherwise, render the existing admin/team invite flow
  return <AcceptStaffInviteForm token={token} className={className} {...props} />;
}

// =============================================================================
// Player Invite Acceptance
// =============================================================================

function AcceptPlayerInviteForm({
  token,
  className,
  ...props
}: { token: string } & React.ComponentProps<"div">) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const acceptPlayerInvite = useMutation(api.players.mutations.acceptPlayerInvite);

  const playerInvite = useQuery(
    api.players.queries.validatePlayerInvite,
    token ? { token } : "skip",
  );

  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  // Track pending invite acceptance — wait for auth to propagate before calling mutation
  const [pendingToken, setPendingToken] = React.useState<string | null>(null);
  const { isAuthenticated } = useConvexAuth();

  // Once auth is established after sign-up, accept the invite
  React.useEffect(() => {
    if (!pendingToken || !isAuthenticated) return;

    let cancelled = false;
    async function accept() {
      try {
        await acceptPlayerInvite({ token: pendingToken! });
        if (!cancelled) router.replace("/");
      } catch (error) {
        if (!cancelled) {
          setFormError(getConvexErrorMessage(error));
          setIsLoading(false);
        }
      }
    }
    accept();
    return () => { cancelled = true; };
  }, [pendingToken, isAuthenticated, acceptPlayerInvite, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Loading
  if (playerInvite === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Invalid/expired token
  if (!playerInvite.valid) {
    const errorMap: Record<string, { title: string; message: string }> = {
      not_found: {
        title: "Invalid Invitation",
        message: "This invitation link is invalid.",
      },
      already_used: {
        title: "Invitation Already Used",
        message: "This invitation has already been accepted.",
      },
      expired: {
        title: "Invitation Expired",
        message: "This invitation has expired. Please ask your club admin to send a new one.",
      },
    };
    const err = errorMap[playerInvite.reason] ?? errorMap.not_found;

    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-2xl font-bold text-destructive">{err.title}</h1>
              <p className="text-muted-foreground">{err.message}</p>
              <Button variant="outline" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite — show registration form
  const { firstName, lastName, email } = playerInvite;

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setFormError(null);

    try {
      // Create the user account via @convex-dev/auth
      await signIn("password", {
        email,
        password: data.password,
        flow: "signUp",
      });

      // Signal that we need to accept the invite once auth propagates
      setPendingToken(token);
    } catch (error) {
      setFormError(getConvexErrorMessage(error));
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-6 md:p-8">
          <form id="form-accept-player-invite" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">
                  Welcome, {firstName}!
                </h1>
                <p className="text-muted-foreground text-balance">
                  You've been invited to create your player account.
                  {" "}
                  <Badge variant="secondary">Player</Badge>
                </p>
              </div>

              {formError && (
                <div className="text-destructive self-center text-sm">
                  {formError}
                </div>
              )}

              <Field>
                <FieldLabel>Name</FieldLabel>
                <div className="text-muted-foreground text-sm">
                  {firstName} {lastName}
                </div>
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <div className="text-muted-foreground text-sm">{email}</div>
              </Field>

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="Create a password"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FieldLabel>
                    <PasswordInput
                      {...field}
                      id="confirmPassword"
                      aria-invalid={fieldState.invalid}
                      placeholder="Confirm your password"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <Button
                  type="submit"
                  form="form-accept-player-invite"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : "Create Account"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                By creating an account, you agree to our{" "}
                <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Staff/Admin Invite Acceptance (existing flow, extracted)
// =============================================================================

function AcceptStaffInviteForm({
  token,
  className,
  ...props
}: { token: string } & React.ComponentProps<"div">) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const acceptInviteMutation = useMutation(api.invitations.mutations.acceptInvite);

  // Query the new invitations table first
  const inviteData = useQuery(
    api.invitations.queries.getInviteByToken,
    token ? { token } : "skip",
  );

  // Fallback to legacy adminInvites table for backward compatibility
  const legacyInvite = useQuery(
    api.table.admin.getInvite,
    token && inviteData === null ? { token } : "skip",
  );
  const legacyAcceptInvite = useMutation(api.table.admin.acceptInvite);

  const { isAuthenticated } = useConvexAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingToken, setPendingToken] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Determine which invite system to use
  const isNewInvite = inviteData && inviteData.status === "valid";
  const isLegacyInvite = !isNewInvite && legacyInvite?.invite;

  const inviteEmail = isNewInvite
    ? inviteData.email
    : isLegacyInvite
      ? legacyInvite.invite.email
      : "";
  const inviteName = isNewInvite
    ? inviteData.name
    : isLegacyInvite
      ? legacyInvite.invite.name
      : "";
  const inviterName = isNewInvite
    ? inviteData.inviterName
    : isLegacyInvite
      ? legacyInvite.inviterName
      : undefined;
  const roleLabel = isNewInvite
    ? ROLE_LABELS[inviteData.role as keyof typeof ROLE_LABELS] ?? inviteData.role
    : "Admin";
  const teamName = isNewInvite ? inviteData.teamName : undefined;

  // Wait for auth propagation before accepting invite (same pattern as player flow)
  React.useEffect(() => {
    if (!pendingToken || !isAuthenticated) return;

    let cancelled = false;
    async function accept() {
      try {
        if (isNewInvite) {
          await acceptInviteMutation({ token: pendingToken! });
        } else {
          await legacyAcceptInvite({ token: pendingToken! });
        }
        if (!cancelled) router.replace("/");
      } catch (error) {
        if (!cancelled) {
          setFormError(getConvexErrorMessage(error));
          setIsLoading(false);
        }
      }
    }
    accept();
    return () => { cancelled = true; };
  }, [pendingToken, isAuthenticated, isNewInvite, acceptInviteMutation, legacyAcceptInvite, router]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!isNewInvite && !isLegacyInvite) return;

    setIsLoading(true);
    setFormError(null);

    try {
      // Sign up with the email from the invite
      await signIn("password", {
        email: inviteEmail,
        password: data.password,
        flow: "signUp",
      });

      // Signal to wait for auth propagation before accepting
      setPendingToken(token);
    } catch (error) {
      setFormError(getConvexErrorMessage(error));
      setIsLoading(false);
    }
  }

  // Show loading while fetching invite
  if (inviteData === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Handle specific error states from the new invite system
  if (inviteData && inviteData.status !== "valid") {
    const errorMessages: Record<string, { title: string; message: string }> = {
      expired: {
        title: "Invitation Expired",
        message:
          "This invitation has expired. Please contact your admin to send a new one.",
      },
      accepted: {
        title: "Invitation Already Used",
        message: "This invitation has already been used.",
      },
      cancelled: {
        title: "Invitation Cancelled",
        message:
          "This invitation has been cancelled. Please contact your admin.",
      },
    };

    const error = errorMessages[inviteData.status];
    if (error) {
      return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card className="overflow-hidden p-0">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <h1 className="text-2xl font-bold text-destructive">
                  {error.title}
                </h1>
                <p className="text-muted-foreground">{error.message}</p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/login")}
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Show generic error if invite is invalid (no valid invite from either system)
  if (!isNewInvite && !isLegacyInvite && inviteData === null && legacyInvite !== undefined) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-2xl font-bold text-destructive">
                Invalid Invitation
              </h1>
              <p className="text-muted-foreground">
                This invitation link is invalid, expired, or has already been
                used.
              </p>
              <Button variant="outline" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still loading legacy fallback
  if (!isNewInvite && !isLegacyInvite) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-6 md:p-8">
          <form id="form-accept-invite" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">
                  Welcome, {inviteName}!
                </h1>
                <p className="text-muted-foreground text-balance">
                  {inviterName && `${inviterName} has invited you`}
                  {!inviterName && "You've been invited"}
                  {teamName && ` to join ${teamName}`} as{" "}
                  <Badge variant="secondary">{roleLabel}</Badge>
                </p>
              </div>

              {formError && (
                <div className="text-destructive self-center text-sm">
                  {formError}
                </div>
              )}

              <Field>
                <FieldLabel>Email</FieldLabel>
                <div className="text-muted-foreground text-sm">
                  {inviteEmail}
                </div>
              </Field>

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="Create a password"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FieldLabel>
                    <PasswordInput
                      {...field}
                      id="confirmPassword"
                      aria-invalid={fieldState.invalid}
                      placeholder="Confirm your password"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <Button
                  type="submit"
                  form="form-accept-invite"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : "Create Account"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                By creating an account, you agree to our{" "}
                <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
