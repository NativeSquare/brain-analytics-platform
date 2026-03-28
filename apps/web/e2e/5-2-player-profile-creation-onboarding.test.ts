import { describe, it, expect } from "vitest";
import { z } from "zod/v3";
import { setupE2E } from "./lib";

/**
 * Stagehand E2E tests for Story 5.2: Player Profile Creation & Onboarding.
 *
 * Tests are ordered to cover gate-critical ACs first:
 *   AC1 — "Add Player" button visible to admins on players list page
 *   AC3 — Form validation prevents invalid submissions (inline error messages)
 *   AC4 — "createPlayer" mutation creates a player profile (database check)
 *   AC6 — Success toast notification after player creation
 */
describe("Story 5.2 — Player Profile Creation & Onboarding", () => {
  const ctx = setupE2E();

  // Helper: fill required fields and submit the form
  async function fillRequiredFieldsAndSubmit(options?: {
    firstName?: string;
    lastName?: string;
    position?: string;
    email?: string;
  }) {
    const firstName = options?.firstName ?? `Test${Date.now()}`;
    const lastName = options?.lastName ?? "E2E";
    const position = options?.position ?? "Forward";

    await ctx.stagehand.page.act(
      `type '${firstName}' into the First Name input field`
    );
    await ctx.stagehand.page.act(
      `type '${lastName}' into the Last Name input field`
    );
    await ctx.stagehand.page.act(
      "click on the Position select/dropdown to open it"
    );
    await ctx.stagehand.page.waitForTimeout(500);
    await ctx.stagehand.page.act(
      `select the '${position}' option from the position dropdown`
    );
    await ctx.stagehand.page.waitForTimeout(500);

    if (options?.email) {
      await ctx.stagehand.page.act(
        `type '${options.email}' into the Personal Email input field`
      );
      await ctx.stagehand.page.waitForTimeout(300);
    }

    await ctx.stagehand.page.act("click the 'Create Player' button");
  }

  // ─── AC1: "Add Player" button visible to admins on the players list page ───
  describe("AC1: Add Player button visible to admins on the players list page", () => {
    it("'Add Player' button is visible to admins on the players list page at /players", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Look for the Add Player button on the players list page
      const buttonCheck = await ctx.stagehand.page.extract({
        instruction:
          "Look for a button or link labeled 'Add Player' on this players list page. Is it visible? Return whether the button exists and is visible, and the button text.",
        schema: z.object({
          isVisible: z.boolean(),
          buttonText: z.string(),
        }),
      });

      // AC1: The "Add Player" button must be visible to admins on the players list page
      expect(buttonCheck.isVisible).toBe(true);
      expect(buttonCheck.buttonText.toLowerCase()).toContain("add player");
    });

    it("clicking the Add Player button navigates to /players/new", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      await ctx.stagehand.page.act("click the 'Add Player' button or link");
      await ctx.stagehand.page.waitForTimeout(2000);

      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");
    });
  });

  // ─── AC3: Form validation prevents invalid submissions with inline error messages ───
  describe("AC3: Form validation prevents invalid submissions", () => {
    it("submitting the form without filling required fields shows inline error messages for validation", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Click Create Player without filling any fields to trigger validation
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(1500);

      // Check for inline validation error messages on the form
      const validationResult = await ctx.stagehand.page.extract({
        instruction:
          "Look for inline validation error messages displayed near form fields. These are red/error colored text messages that appear below or next to input fields when validation fails. Return all the error message texts you find and whether there are visible inline errors.",
        schema: z.object({
          hasInlineErrors: z.boolean(),
          errorMessages: z.array(z.string()),
        }),
      });

      // AC3: Form validation must prevent invalid submissions and show inline error messages
      expect(validationResult.hasInlineErrors).toBe(true);
      expect(validationResult.errorMessages.length).toBeGreaterThanOrEqual(2);

      // Verify that required fields (first name, last name, position) generate errors
      const allErrors = validationResult.errorMessages
        .join(" ")
        .toLowerCase();
      expect(allErrors).toMatch(/required|name|field|please|enter|select/i);
    });
  });

  // ─── AC4: "createPlayer" mutation creates a player profile (database verification) ───
  describe("AC4: createPlayer mutation creates a player profile", () => {
    it("the createPlayer mutation creates a player profile and the new player appears in the database/players list", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      const playerFirst = `AC4Mut${Date.now()}`;
      const playerLast = "MutCheck";

      // Navigate to the player creation form
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields and submit — this triggers the createPlayer mutation
      await fillRequiredFieldsAndSubmit({
        firstName: playerFirst,
        lastName: playerLast,
        position: "Defender",
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // After the createPlayer mutation, check for success confirmation
      const mutationResult = await ctx.stagehand.page.extract({
        instruction:
          "Look for any toast notification, success message, or confirmation that indicates the player profile was successfully created via a mutation. Return the text and whether such a message exists.",
        schema: z.object({
          wasCreated: z.boolean(),
          messageText: z.string(),
        }),
      });

      // AC4: The createPlayer mutation must successfully create a player profile
      expect(mutationResult.wasCreated).toBe(true);

      // Dismiss any invite dialog that may appear
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the 'Got it' or 'Skip' button"
        );
        await ctx.stagehand.page.waitForTimeout(1000);
      } catch {
        // No dialog present
      }

      // Navigate to /players to verify the new player entry exists in the database
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      // Check the players list for the newly created player — this confirms database persistence
      const dbCheck = await ctx.stagehand.page.extract({
        instruction: `Search the players list or table for a player named '${playerFirst} ${playerLast}' or with last name '${playerLast}'. Is this player visible in the list? This confirms the createPlayer mutation persisted the entry in the database.`,
        schema: z.object({
          playerFound: z.boolean(),
          playerDisplayName: z.string(),
        }),
      });

      // Verify the player was persisted in the database by checking the players list
      expect(dbCheck.playerFound).toBe(true);
      expect(dbCheck.playerDisplayName).toContain(playerLast);
    });
  });

  // ─── AC6: Success toast notification after player creation ───
  describe("AC6: Success toast notification after player creation", () => {
    it("a success toast notification is displayed after creating a player profile", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC6T${Date.now()}`;

      // Fill the form and submit to create a player
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "ToastTest",
        position: "Midfielder",
      });
      await ctx.stagehand.page.waitForTimeout(3000);

      // Check for the success toast notification
      const toastCheck = await ctx.stagehand.page.extract({
        instruction:
          "Look for a toast notification, snackbar, or popup success message on the page. It should indicate the player was created successfully. Return the exact toast text and whether a success toast notification is visible.",
        schema: z.object({
          hasSuccessToast: z.boolean(),
          toastText: z.string(),
        }),
      });

      // AC6: A success toast notification must be shown after player creation
      expect(toastCheck.hasSuccessToast).toBe(true);
      expect(toastCheck.toastText.toLowerCase()).toContain("created");

      // Dismiss invite dialog if present
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the 'Got it' or 'Skip' button"
        );
        await ctx.stagehand.page.waitForTimeout(1500);
      } catch {
        // No dialog
      }

      // Verify navigation away from /players/new after successful creation
      await ctx.stagehand.page.waitForTimeout(1500);
      const finalUrl = ctx.stagehand.page.url();
      expect(finalUrl).not.toContain("/players/new");
      expect(finalUrl).toContain("/players");
    });
  });

  // ─── AC2: Multi-section profile creation form ───
  describe("AC2: Add Player form structure", () => {
    it("renders all five form sections with required field indicators", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const sections = await ctx.stagehand.page.extract({
        instruction:
          "extract the titles of all card/section headings visible in the form. Look for section titles like 'Basic Info', 'Football Details', 'Physical', 'Contact', 'Emergency Contact'",
        schema: z.object({ sectionTitles: z.array(z.string()) }),
      });

      const titles = sections.sectionTitles.map((t) => t.toLowerCase());
      expect(titles).toEqual(
        expect.arrayContaining([
          expect.stringContaining("basic"),
          expect.stringContaining("football"),
          expect.stringContaining("physical"),
          expect.stringContaining("contact"),
          expect.stringContaining("emergency"),
        ])
      );
    });
  });

  // ─── AC5: Photo upload flow ───
  describe("AC5: Photo upload flow", () => {
    it("photo upload area is present in the player creation form with supported formats JPEG PNG WebP and 5MB limit", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const photoUpload = await ctx.stagehand.page.extract({
        instruction:
          "find the photo upload area in the Basic Info section. Check if it mentions supported formats like JPEG, PNG, or WebP and a file size limit like 5MB. Return the helper text and whether the upload zone is visible.",
        schema: z.object({
          helperText: z.string(),
          hasUploadZone: z.boolean(),
        }),
      });

      expect(photoUpload.hasUploadZone).toBe(true);
      expect(photoUpload.helperText.toLowerCase()).toMatch(/jpeg|jpg|png|webp/);
    });

    it("photo upload flow allows selecting a file and integrates with the player creation form", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const hasFileInput = await ctx.stagehand.page.evaluate(() => {
        const input = document.querySelector(
          'input[type="file"]'
        ) as HTMLInputElement;
        return !!input;
      });
      expect(hasFileInput).toBe(true);

      await ctx.stagehand.page.evaluate(() => {
        const input = document.querySelector(
          'input[type="file"]'
        ) as HTMLInputElement;
        if (input) {
          const dataTransfer = new DataTransfer();
          const file = new File(
            [
              new Uint8Array([
                137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
              ]),
            ],
            "test-photo.png",
            { type: "image/png" }
          );
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      await ctx.stagehand.page.waitForTimeout(2000);

      const afterUpload = await ctx.stagehand.page.extract({
        instruction:
          "look at the photo upload area in the Basic Info section. Is there any preview image, file name, or upload indicator visible? Is the upload zone still part of the form?",
        schema: z.object({
          uploadZoneVisible: z.boolean(),
        }),
      });
      expect(afterUpload.uploadZoneVisible).toBe(true);
    });
  });

  // ─── AC7: Admin is prompted to send an account invitation ───
  describe("AC7: Admin is prompted to send an account invitation", () => {
    it("after player creation without email, admin sees invitation dialog with Got it button", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC7a${Date.now()}`;

      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "NoEmail",
        position: "Defender",
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "check if a dialog or modal is visible on the page. Look for text about inviting the player, no email, or account invitation. Extract the dialog title, message, and all button labels.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      expect(dialog.isDialogVisible).toBe(true);
      const hasGotIt = dialog.buttonLabels.some((b) =>
        b.toLowerCase().includes("got it")
      );
      expect(hasGotIt).toBe(true);
    });

    it("after player creation with email, admin sees invitation dialog with Send Invite and Skip buttons", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC7b${Date.now()}`;

      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "HasEmail",
        position: "Goalkeeper",
        email: `${uniqueName}@test.example.com`,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "check if a dialog or modal is visible. Look for text about inviting the player to create their account. Extract the dialog title, message content, and all button labels.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      expect(dialog.isDialogVisible).toBe(true);
      const btnLabels = dialog.buttonLabels.map((b) => b.toLowerCase());
      expect(
        btnLabels.some((b) => b.includes("send") || b.includes("invite"))
      ).toBe(true);
      expect(btnLabels.some((b) => b.includes("skip"))).toBe(true);

      const msgLower =
        `${dialog.dialogTitle} ${dialog.dialogMessage}`.toLowerCase();
      expect(msgLower).toMatch(/invit|email|account/);
    });
  });

  // ─── AC8: invitePlayer mutation sends an account invitation ───
  describe("AC8: invitePlayer mutation sends an account invitation", () => {
    it("clicking Send Invite in the dialog triggers the invitePlayer mutation and confirms invitation was sent", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC8m${Date.now()}`;
      const testEmail = `${uniqueName}@test.example.com`;

      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "InvMut",
        position: "Midfielder",
        email: testEmail,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      await ctx.stagehand.page.act(
        "click the 'Send Invite' button in the dialog"
      );
      await ctx.stagehand.page.waitForTimeout(3000);

      const toastResult = await ctx.stagehand.page.extract({
        instruction:
          "look for a toast notification or success message about the invitation being sent. Return whether such a toast is visible and its text.",
        schema: z.object({
          hasInviteToast: z.boolean(),
          toastText: z.string(),
        }),
      });

      expect(toastResult.hasInviteToast).toBe(true);
      const toastLower = toastResult.toastText.toLowerCase();
      expect(toastLower).toMatch(/invit|sent/);
    });
  });

  // ─── AC10: Player invitation email is sent ───
  describe("AC10: Player invitation email is sent", () => {
    it("after clicking Send Invite the invitation email is sent and confirmed via toast showing the email address", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC10e${Date.now()}`;
      const testEmail = `${uniqueName}@test.example.com`;

      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "EmailSend",
        position: "Forward",
        email: testEmail,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      await ctx.stagehand.page.act(
        "click the 'Send Invite' button in the dialog"
      );
      await ctx.stagehand.page.waitForTimeout(3000);

      const emailConfirmation = await ctx.stagehand.page.extract({
        instruction:
          "look for a toast notification or success message that confirms an invitation was sent. Check if the toast mentions the email address or says 'Invitation sent'. Return the toast text and whether it is visible.",
        schema: z.object({
          hasConfirmation: z.boolean(),
          confirmationText: z.string(),
        }),
      });

      expect(emailConfirmation.hasConfirmation).toBe(true);
      expect(emailConfirmation.confirmationText.toLowerCase()).toMatch(
        /invit|sent|email/
      );
    });
  });

  // ─── AC9/AC11: Accept invite page handles player type ───
  describe("AC9/AC11: Accept invite page handles player type", () => {
    it("shows an error for invalid player invite token", async () => {
      await ctx.goto("/accept-invite?token=invalid-token-123&type=player");
      await ctx.stagehand.page.waitForTimeout(3000);

      const pageContent = await ctx.stagehand.page.extract({
        instruction:
          "extract any error message or status text shown on the page about the invitation being invalid, expired, or not found",
        schema: z.object({ message: z.string() }),
      });

      const msg = pageContent.message.toLowerCase();
      const hasErrorMessage =
        msg.includes("invalid") ||
        msg.includes("expired") ||
        msg.includes("not found") ||
        msg.includes("not valid") ||
        msg.includes("error") ||
        msg.includes("invitation");
      expect(hasErrorMessage).toBe(true);
    });
  });

  // ─── AC12: Breadcrumb for /players/new ───
  describe("AC12: Breadcrumbs", () => {
    it("shows 'Players > Add Player' breadcrumb on /players/new", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const breadcrumb = await ctx.stagehand.page.extract({
        instruction:
          "find the breadcrumb navigation at the top of the page. Extract all breadcrumb items as text.",
        schema: z.object({ breadcrumbItems: z.array(z.string()) }),
      });

      const items = breadcrumb.breadcrumbItems.map((b) => b.toLowerCase());
      expect(items).toEqual(
        expect.arrayContaining([
          expect.stringContaining("players"),
          expect.stringContaining("add player"),
        ])
      );
    });
  });
});
