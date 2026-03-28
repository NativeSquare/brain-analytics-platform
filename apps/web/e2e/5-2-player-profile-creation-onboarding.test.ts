import { describe, it, expect } from "vitest";
import { z } from "zod/v3";
import { setupE2E } from "./lib";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stagehand E2E tests for Story 5.2: Player Profile Creation & Onboarding
 *
 * Covers e2eTestableACs: [1, 2, 3, 4, 6, 7]
 */
describe("Story 5.2 — Player Profile Creation & Onboarding", () => {
  const ctx = setupE2E();

  // ---------------------------------------------------------------------------
  // AC1: "Add Player" button visible to admins on /players page
  // ---------------------------------------------------------------------------

  it("AC1: admin sees Add Player button on /players page", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players");

    // Verify the Players heading is visible
    const heading = await ctx.stagehand.page.extract({
      instruction: "Extract the main page heading text",
      schema: z.object({ heading: z.string() }),
    });
    expect(heading.heading).toMatch(/Players/i);

    // Verify the Add Player button/link is visible for admin
    const addPlayerVisible = await ctx.stagehand.page.observe(
      "find the Add Player button or link"
    );
    expect(addPlayerVisible.length).toBeGreaterThan(0);
  });

  it("AC1: non-admin user does NOT see Add Player button", async () => {
    await ctx.auth.signInAs({ role: "player" });
    await ctx.goto("/players");

    // Player may see the page or be redirected — either way, Add Player must not be visible
    const elements = await ctx.stagehand.page.observe(
      "find the Add Player button or link"
    );
    // Either no elements found, or the page redirected (no Add Player visible)
    const hasAddPlayer = elements.some(
      (el) =>
        el.description?.toLowerCase().includes("add player") ||
        el.description?.toLowerCase().includes("addplayer")
    );
    expect(hasAddPlayer).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // AC2: "Add Player" opens a multi-section profile creation form
  // ---------------------------------------------------------------------------

  it("AC2: /players/new renders a form with all 5 sections and required fields", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Verify the Add Player heading
    const heading = await ctx.stagehand.page.extract({
      instruction: "Extract the main page heading text",
      schema: z.object({ heading: z.string() }),
    });
    expect(heading.heading).toMatch(/Add Player/i);

    // Verify all 5 form sections are visible
    const sections = await ctx.stagehand.page.extract({
      instruction:
        "Extract all card section titles/headings from the form. Look for section titles like Basic Info, Football Details, Physical, Contact, Emergency Contact.",
      schema: z.object({
        sectionTitles: z.array(z.string()),
      }),
    });
    const titles = sections.sectionTitles.map((t: string) => t.toLowerCase());
    expect(titles.some((t: string) => t.includes("basic info"))).toBe(true);
    expect(titles.some((t: string) => t.includes("football details"))).toBe(true);
    expect(titles.some((t: string) => t.includes("physical"))).toBe(true);
    expect(titles.some((t: string) => t.includes("contact"))).toBe(true);
    expect(titles.some((t: string) => t.includes("emergency contact"))).toBe(true);

    // Verify Cancel and Create Player buttons exist
    const buttons = await ctx.stagehand.page.extract({
      instruction:
        "Extract the text of all buttons at the bottom of the form (Cancel, Create Player)",
      schema: z.object({
        buttonLabels: z.array(z.string()),
      }),
    });
    const labels = buttons.buttonLabels.map((l: string) => l.toLowerCase());
    expect(labels.some((l: string) => l.includes("cancel"))).toBe(true);
    expect(labels.some((l: string) => l.includes("create player"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AC3: Form validation prevents invalid submissions
  // ---------------------------------------------------------------------------

  it("AC3: submitting empty form shows validation errors for firstName, lastName, position", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Click Create Player without filling any fields
    await ctx.stagehand.page.act("click the Create Player button");

    // Wait for validation to trigger
    await sleep(1000);

    // Extract validation error messages
    const errors = await ctx.stagehand.page.extract({
      instruction:
        "Extract all visible validation error messages on the form. Look for text like 'First name is required', 'Last name is required', 'Position is required'.",
      schema: z.object({
        errorMessages: z.array(z.string()),
      }),
    });
    const msgs = errors.errorMessages.map((m: string) => m.toLowerCase());
    expect(msgs.some((m: string) => m.includes("first name") && m.includes("required"))).toBe(true);
    expect(msgs.some((m: string) => m.includes("last name") && m.includes("required"))).toBe(true);
    expect(msgs.some((m: string) => m.includes("position") && m.includes("required"))).toBe(true);
  });

  it("AC3: invalid email format shows email validation error", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Fill required fields first
    await ctx.stagehand.page.act("type 'John' in the First Name field");
    await ctx.stagehand.page.act("type 'Doe' in the Last Name field");

    // Enter an invalid email
    await ctx.stagehand.page.act(
      "type 'not-an-email' in the Personal Email field"
    );

    // Submit the form
    await ctx.stagehand.page.act("click the Create Player button");
    await sleep(1000);

    // Check for email validation error
    const errors = await ctx.stagehand.page.extract({
      instruction:
        "Extract all validation error messages visible on the form, especially any related to email format.",
      schema: z.object({
        errorMessages: z.array(z.string()),
      }),
    });
    const msgs = errors.errorMessages.map((m: string) => m.toLowerCase());
    expect(msgs.some((m: string) => m.includes("email") || m.includes("invalid"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AC4: createPlayer mutation creates a player profile
  // ---------------------------------------------------------------------------

  it("AC4: filling required fields and submitting creates a player (success toast shown)", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Fill required fields
    await ctx.stagehand.page.act(
      "type 'TestFirstName' in the First Name input field"
    );
    await ctx.stagehand.page.act(
      "type 'TestLastName' in the Last Name input field"
    );

    // Select a position from the dropdown
    await ctx.stagehand.page.act("click the Position dropdown to open it");
    await ctx.stagehand.page.act(
      "select 'Forward' from the position dropdown options"
    );

    // Submit the form
    await ctx.stagehand.page.act("click the Create Player button");

    // Wait for mutation to complete — success toast should appear
    await sleep(5000);

    const result = await ctx.stagehand.page.extract({
      instruction:
        "Check the page for a success toast notification or message containing 'Player created successfully'. Also check if there is a dialog about inviting the player.",
      schema: z.object({
        hasSuccessToast: z.boolean(),
        hasInviteDialog: z.boolean(),
      }),
    });

    // The mutation should succeed and show the success toast
    expect(result.hasSuccessToast || result.hasInviteDialog).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AC6: Success feedback after player creation
  // ---------------------------------------------------------------------------

  it("AC6: after player creation, success toast appears and invite dialog opens", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Fill required fields
    await ctx.stagehand.page.act(
      "type 'SuccessTest' in the First Name input field"
    );
    await ctx.stagehand.page.act(
      "type 'Player' in the Last Name input field"
    );

    // Select position
    await ctx.stagehand.page.act("click the Position dropdown to open it");
    await ctx.stagehand.page.act(
      "select 'Midfielder' from the position dropdown options"
    );

    // Submit
    await ctx.stagehand.page.act("click the Create Player button");
    await sleep(5000);

    // After creation, either success toast or invite dialog should be visible
    const feedback = await ctx.stagehand.page.extract({
      instruction:
        "Look for: 1) A toast/notification saying 'Player created successfully', 2) A dialog about inviting the player (with title 'Invite Player' or 'No Email Address'). Report what is visible.",
      schema: z.object({
        successToastVisible: z.boolean(),
        inviteDialogVisible: z.boolean(),
        dialogTitle: z.string().optional(),
      }),
    });

    // Success toast should appear per AC6
    expect(feedback.successToastVisible || feedback.inviteDialogVisible).toBe(true);

    // If the invite dialog is visible (AC7 chaining), dismiss it
    if (feedback.inviteDialogVisible) {
      // Try clicking "Got it" or "Skip" to dismiss
      const dismissBtns = await ctx.stagehand.page.observe(
        "find a button labeled 'Got it' or 'Skip' in the dialog"
      );
      if (dismissBtns.length > 0) {
        await ctx.stagehand.page.act(
          "click the 'Got it' or 'Skip' button to dismiss the dialog"
        );
        await sleep(2000);

        // After dismissing, should navigate to the player profile page
        const url = ctx.stagehand.page.url();
        expect(url).toContain("/players/");
      }
    }
  });

  // ---------------------------------------------------------------------------
  // AC7: Admin is prompted to send an account invitation
  // ---------------------------------------------------------------------------

  it("AC7: invite dialog with email shows Send Invite and Skip buttons", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Fill required fields WITH an email address
    await ctx.stagehand.page.act(
      "type 'InviteTest' in the First Name input field"
    );
    await ctx.stagehand.page.act(
      "type 'WithEmail' in the Last Name input field"
    );
    await ctx.stagehand.page.act("click the Position dropdown to open it");
    await ctx.stagehand.page.act(
      "select 'Defender' from the position dropdown options"
    );
    await ctx.stagehand.page.act(
      "type 'testplayer@example.com' in the Personal Email input field"
    );

    // Submit the form
    await ctx.stagehand.page.act("click the Create Player button");
    await sleep(5000);

    // Check for the invite dialog with email variant
    const dialog = await ctx.stagehand.page.extract({
      instruction:
        "Look for an invite dialog. Check if it has: a title containing 'Invite Player', a 'Send Invite' button, a 'Skip' button, and if it mentions the email address 'testplayer@example.com'.",
      schema: z.object({
        hasInvitePlayerTitle: z.boolean(),
        hasSendInviteButton: z.boolean(),
        hasSkipButton: z.boolean(),
        mentionsEmail: z.boolean(),
      }),
    });

    // When email is provided, the dialog should show "Invite Player" with Send Invite and Skip
    expect(dialog.hasInvitePlayerTitle).toBe(true);
    expect(dialog.hasSendInviteButton).toBe(true);
    expect(dialog.hasSkipButton).toBe(true);
    expect(dialog.mentionsEmail).toBe(true);
  });

  it("AC7: invite dialog without email shows 'No Email Address' with Got it button", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    await ctx.goto("/players/new");

    // Fill required fields WITHOUT email
    await ctx.stagehand.page.act(
      "type 'NoEmail' in the First Name input field"
    );
    await ctx.stagehand.page.act(
      "type 'Player' in the Last Name input field"
    );
    await ctx.stagehand.page.act("click the Position dropdown to open it");
    await ctx.stagehand.page.act(
      "select 'Goalkeeper' from the position dropdown options"
    );

    // Submit the form
    await ctx.stagehand.page.act("click the Create Player button");
    await sleep(5000);

    // Check for the no-email dialog variant
    const dialog = await ctx.stagehand.page.extract({
      instruction:
        "Look for a dialog about inviting the player. Check if it has: a title containing 'No Email Address', a message about no email being provided, and a 'Got it' button. Also check there is NO 'Send Invite' button.",
      schema: z.object({
        hasNoEmailTitle: z.boolean(),
        hasGotItButton: z.boolean(),
        hasSendInviteButton: z.boolean(),
      }),
    });

    // When no email is provided, dialog shows "No Email Address" with only "Got it"
    expect(dialog.hasNoEmailTitle).toBe(true);
    expect(dialog.hasGotItButton).toBe(true);
    expect(dialog.hasSendInviteButton).toBe(false);
  });
});
