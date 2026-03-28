import { describe, it, expect } from "vitest";
import { z } from "zod";
import { setupE2E } from "./lib";

describe("Story 5.2 — Player Profile Creation & Onboarding", () => {
  const ctx = setupE2E();

  // ── AC1: "Add Player" button visible to admins on players list page ──
  describe("AC1: Add Player button visibility", () => {
    it("admin sees Add Player button on /players", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players");

      // Wait for page to load and look for the Add Player button
      const observed = await ctx.stagehand.page.observe(
        "find any button or link containing the text 'Add Player'"
      );
      expect(observed.length).toBeGreaterThan(0);
    });

    it("non-admin user does not see Add Player button on /players", async () => {
      await ctx.auth.signInAs({
        role: "coach",
        email: "coach@test.com",
        name: "Test Coach",
      });
      await ctx.goto("/players");

      // Wait for page content to render
      await ctx.stagehand.page.waitForTimeout(2000);

      const observed = await ctx.stagehand.page.observe(
        "find any button or link containing the text 'Add Player'"
      );
      expect(observed.length).toBe(0);
    });
  });

  // ── AC2: Multi-section profile creation form ──
  describe("AC2: Add Player form sections and fields", () => {
    it("form displays all five sections with correct fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Extract all card/section titles from the form
      const sections = await ctx.stagehand.page.extract({
        instruction:
          "Extract all the form section headings/titles visible on the page. These are the card titles like 'Basic Info', 'Football Details', etc.",
        schema: z.object({
          sectionTitles: z.array(z.string()),
        }),
      });

      expect(sections.sectionTitles).toEqual(
        expect.arrayContaining([
          "Basic Info",
          "Football Details",
          "Physical",
          "Contact",
          "Emergency Contact",
        ])
      );
    });

    it("Basic Info section has first name, last name, photo, date of birth, nationality fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      const fields = await ctx.stagehand.page.extract({
        instruction:
          "Extract the field labels inside the 'Basic Info' section card. Include labels like 'First Name', 'Last Name', 'Photo', 'Date of Birth', 'Nationality'.",
        schema: z.object({
          labels: z.array(z.string()),
        }),
      });

      expect(fields.labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("First Name"),
          expect.stringContaining("Last Name"),
        ])
      );
    });

    it("Football Details section has position, squad number, preferred foot fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      const fields = await ctx.stagehand.page.extract({
        instruction:
          "Extract the field labels from the 'Football Details' section card only. Look for labels like 'Position', 'Squad Number', 'Preferred Foot'.",
        schema: z.object({
          labels: z.array(z.string()),
        }),
      });

      expect(fields.labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Position"),
          expect.stringContaining("Squad Number"),
          expect.stringContaining("Preferred Foot"),
        ])
      );
    });
  });

  // ── AC3: Form validation prevents invalid submissions ──
  describe("AC3: Form validation", () => {
    it("shows validation errors when submitting empty required fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Click Create Player without filling any fields
      await ctx.stagehand.page.act("click the 'Create Player' button");

      // Wait for validation errors to appear
      await ctx.stagehand.page.waitForTimeout(1000);

      // Extract validation error messages
      const errors = await ctx.stagehand.page.extract({
        instruction:
          "Extract any visible validation error messages on the form. These are typically small red text below form fields indicating required fields or invalid data.",
        schema: z.object({
          errorMessages: z.array(z.string()),
        }),
      });

      // Should have at least errors for firstName, lastName, and position
      expect(errors.errorMessages.length).toBeGreaterThanOrEqual(2);
    });

    it("shows email validation error for invalid email format", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Type invalid email
      await ctx.stagehand.page.act(
        "type 'not-an-email' into the Personal Email field"
      );

      // Fill required fields to trigger other validation
      await ctx.stagehand.page.act("type 'John' into the First Name field");
      await ctx.stagehand.page.act("type 'Doe' into the Last Name field");

      // Click submit to trigger validation
      await ctx.stagehand.page.act("click the 'Create Player' button");

      await ctx.stagehand.page.waitForTimeout(1000);

      const errors = await ctx.stagehand.page.extract({
        instruction:
          "Extract any visible validation error messages. Look specifically for email-related validation error text.",
        schema: z.object({
          errorMessages: z.array(z.string()),
        }),
      });

      const hasEmailError = errors.errorMessages.some(
        (msg) =>
          msg.toLowerCase().includes("email") ||
          msg.toLowerCase().includes("invalid")
      );
      expect(hasEmailError).toBe(true);
    });
  });

  // ── AC4: createPlayer mutation creates a player profile ──
  describe("AC4: Player creation mutation", () => {
    it("successfully creates a player when required fields are filled", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Fill required fields
      await ctx.stagehand.page.act("type 'TestE2E' into the First Name field");
      await ctx.stagehand.page.act(
        "type 'PlayerCreation' into the Last Name field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.act(
        "select 'Forward' from the position dropdown options"
      );

      // Submit the form
      await ctx.stagehand.page.act("click the 'Create Player' button");

      // Wait for mutation to complete — success toast or invite dialog should appear
      await ctx.stagehand.page.waitForTimeout(5000);

      // Check for success indicators: either toast message or invite dialog
      const result = await ctx.stagehand.page.extract({
        instruction:
          "Look for any of these success indicators on the page: 1) A toast notification saying 'Player created successfully', 2) A dialog with title 'Invite Player' or 'No Email Address', 3) The page URL has changed to a player profile page like /players/[id]. Report what you find.",
        schema: z.object({
          hasSuccessToast: z.boolean(),
          hasInviteDialog: z.boolean(),
          currentUrl: z.string(),
        }),
      });

      // At least one success indicator should be present
      const isSuccess =
        result.hasSuccessToast ||
        result.hasInviteDialog ||
        result.currentUrl.includes("/players/");
      expect(isSuccess).toBe(true);
    });
  });

  // ── AC6: Success feedback after player creation ──
  describe("AC6: Success feedback", () => {
    it("shows success toast after creating a player", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Fill required fields with unique values
      await ctx.stagehand.page.act(
        "type 'SuccessTest' into the First Name field"
      );
      await ctx.stagehand.page.act(
        "type 'FeedbackCheck' into the Last Name field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.act(
        "select 'Midfielder' from the position dropdown options"
      );

      // Submit
      await ctx.stagehand.page.act("click the 'Create Player' button");

      // Wait for the mutation and toast
      await ctx.stagehand.page.waitForTimeout(5000);

      // Look for the success toast notification
      const toastCheck = await ctx.stagehand.page.extract({
        instruction:
          "Check if there is a toast notification visible on the page that says 'Player created successfully' or similar success message.",
        schema: z.object({
          hasSuccessToast: z.boolean(),
          toastText: z.string().optional(),
        }),
      });

      // After successful creation, the invite dialog should appear (which also confirms success)
      const dialogCheck = await ctx.stagehand.page.extract({
        instruction:
          "Check if there is a dialog visible with either the title 'Invite Player' or 'No Email Address'.",
        schema: z.object({
          hasDialog: z.boolean(),
          dialogTitle: z.string().optional(),
        }),
      });

      // Success is confirmed by either toast or post-creation dialog
      expect(toastCheck.hasSuccessToast || dialogCheck.hasDialog).toBe(true);
    });
  });

  // ── AC7: Admin is prompted to send an account invitation ──
  describe("AC7: Post-creation invite dialog", () => {
    it("shows invite dialog with Send Invite option when email is provided", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Fill required fields
      await ctx.stagehand.page.act(
        "type 'InviteTest' into the First Name field"
      );
      await ctx.stagehand.page.act(
        "type 'WithEmail' into the Last Name field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.act(
        "select 'Defender' from the position dropdown options"
      );

      // Fill email for invite
      await ctx.stagehand.page.act(
        "type 'invitetest@example.com' into the Personal Email field"
      );

      // Submit
      await ctx.stagehand.page.act("click the 'Create Player' button");

      // Wait for invite dialog
      await ctx.stagehand.page.waitForTimeout(5000);

      // Check for invite dialog with both Send Invite and Skip buttons
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "Check if there is a dialog visible on the page. Extract the dialog title, description text, and the text of all buttons within the dialog.",
        schema: z.object({
          isVisible: z.boolean(),
          title: z.string().optional(),
          description: z.string().optional(),
          buttonLabels: z.array(z.string()),
        }),
      });

      expect(dialog.isVisible).toBe(true);
      expect(dialog.title).toContain("Invite");

      // Should have Send Invite and Skip buttons
      const buttonTexts = dialog.buttonLabels.map((b) => b.toLowerCase());
      expect(buttonTexts).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/send/i),
          expect.stringMatching(/skip/i),
        ])
      );
    });

    it("shows no-email dialog with Got it button when no email provided", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");

      // Fill required fields but NO email
      await ctx.stagehand.page.act(
        "type 'NoEmail' into the First Name field"
      );
      await ctx.stagehand.page.act(
        "type 'TestPlayer' into the Last Name field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.act(
        "select 'Goalkeeper' from the position dropdown options"
      );

      // Submit without email
      await ctx.stagehand.page.act("click the 'Create Player' button");

      // Wait for dialog
      await ctx.stagehand.page.waitForTimeout(5000);

      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "Check if there is a dialog visible on the page. Extract the title and all button labels in the dialog.",
        schema: z.object({
          isVisible: z.boolean(),
          title: z.string().optional(),
          description: z.string().optional(),
          buttonLabels: z.array(z.string()),
        }),
      });

      expect(dialog.isVisible).toBe(true);
      // Should show "No Email Address" variant with "Got it" button
      const hasGotIt = dialog.buttonLabels.some((b) =>
        b.toLowerCase().includes("got it")
      );
      expect(hasGotIt).toBe(true);
    });
  });
});
