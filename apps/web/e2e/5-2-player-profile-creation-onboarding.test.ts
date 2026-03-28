import { describe, it, expect } from "vitest";
import { z } from "zod/v3";
import { setupE2E } from "./lib";

/**
 * Stagehand E2E tests for Story 5.2: Player Profile Creation & Onboarding.
 *
 * Tests are ordered so that gate-critical ACs (4-7) run early, before potential timeouts.
 * Each AC re-authenticates to ensure a clean session.
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
    await ctx.stagehand.page.waitForTimeout(400);
    await ctx.stagehand.page.act(
      `select the '${position}' option from the position dropdown`
    );
    await ctx.stagehand.page.waitForTimeout(400);

    if (options?.email) {
      await ctx.stagehand.page.act(
        `type '${options.email}' into the Personal Email input field`
      );
      await ctx.stagehand.page.waitForTimeout(300);
    }

    await ctx.stagehand.page.act("click the 'Create Player' button");
  }

  // ─── AC1: "Add Player" button visible to admins on /players ───
  describe("AC1: Add Player button visibility", () => {
    it("admin can see the Add Player button on the players list page", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      const elements = await ctx.stagehand.page.observe(
        "find the 'Add Player' button or link on the page"
      );
      expect(elements.length).toBeGreaterThan(0);
    });

    it("clicking Add Player navigates to /players/new", async () => {
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      await ctx.stagehand.page.act("click the 'Add Player' button or link");
      await ctx.stagehand.page.waitForTimeout(2000);

      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");
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

  // ─── AC3: Form validation prevents invalid submissions ───
  describe("AC3: Form validation", () => {
    it("shows validation errors when submitting empty required fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(1000);

      const errors = await ctx.stagehand.page.extract({
        instruction:
          "find all inline validation error messages displayed on the form. Return the text of each error message.",
        schema: z.object({ errorMessages: z.array(z.string()) }),
      });

      expect(errors.errorMessages.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── AC4: createPlayer mutation creates a player profile ───
  describe("AC4: createPlayer mutation creates a player profile", () => {
    it("createPlayer mutation creates a player profile and persists it in the database", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      const playerFirst = `AC4P${Date.now()}`;
      const playerLast = "MutVerify";

      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields and submit — triggers the createPlayer mutation
      await fillRequiredFieldsAndSubmit({
        firstName: playerFirst,
        lastName: playerLast,
        position: "Forward",
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // The createPlayer mutation should have succeeded — check for success toast
      const successCheck = await ctx.stagehand.page.extract({
        instruction:
          "look for any toast notification, success message, or confirmation that a player was created. Return whether a success indication was found and the text of any message.",
        schema: z.object({
          hasSuccessIndication: z.boolean(),
          successText: z.string(),
        }),
      });

      // Verify the mutation reported success
      expect(successCheck.hasSuccessIndication).toBe(true);
      expect(successCheck.successText.toLowerCase()).toContain("created");

      // Dismiss any invite dialog that appears after creation
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the 'Got it' or 'Skip' button"
        );
        await ctx.stagehand.page.waitForTimeout(1000);
      } catch {
        // No dialog present — that's fine
      }

      // Navigate to /players to verify the player was persisted by the mutation
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      // The mutation should have written the player document to the database
      const playersData = await ctx.stagehand.page.extract({
        instruction: `search the players list or table for a player with the last name '${playerLast}'. Is a player with this name visible?`,
        schema: z.object({
          playerFound: z.boolean(),
          playerName: z.string(),
        }),
      });

      expect(playersData.playerFound).toBe(true);
      expect(playersData.playerName).toContain(playerLast);
    });
  });

  // ─── AC5: Photo upload flow ───
  describe("AC5: Photo upload flow", () => {
    it("Photo upload flow shows upload area with supported formats and integrates with player creation form", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify the photo upload area exists and shows format/size info
      const photoUpload = await ctx.stagehand.page.extract({
        instruction:
          "find the photo upload area in the Basic Info section. Extract: the helper text about file formats and size limits, whether a clickable upload zone is visible, and whether it mentions JPEG/PNG/WebP formats.",
        schema: z.object({
          helperText: z.string(),
          hasUploadZone: z.boolean(),
          mentionsFormats: z.boolean(),
        }),
      });

      // Photo upload must show supported formats
      expect(photoUpload.helperText.toLowerCase()).toMatch(/jpeg|jpg|png/);
      expect(photoUpload.helperText.toLowerCase()).toContain("5mb");
      expect(photoUpload.hasUploadZone).toBe(true);
      expect(photoUpload.mentionsFormats).toBe(true);

      // Verify photo upload is integrated into the profile creation form
      const formStructure = await ctx.stagehand.page.extract({
        instruction:
          "in the Basic Info section, check if there is a photo upload area alongside the name fields. Does the photo upload exist as part of the player profile creation form?",
        schema: z.object({
          hasPhotoUploadInForm: z.boolean(),
          isInBasicInfoSection: z.boolean(),
        }),
      });

      expect(formStructure.hasPhotoUploadInForm).toBe(true);
      expect(formStructure.isInBasicInfoSection).toBe(true);

      // Verify the upload area is interactive by observing actionable elements
      const uploadElements = await ctx.stagehand.page.observe(
        "find the photo upload area, drag-and-drop zone, or file picker button in the Basic Info section"
      );
      expect(uploadElements.length).toBeGreaterThan(0);

      // Programmatically set a file on the hidden input to test upload integration
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

      // After file selection, the upload zone should still be visible/functional
      const afterUpload = await ctx.stagehand.page.extract({
        instruction:
          "look at the photo upload area in the Basic Info section. Is there any preview image, file name indication, or is the upload zone still visible?",
        schema: z.object({
          uploadZoneVisible: z.boolean(),
        }),
      });
      expect(afterUpload.uploadZoneVisible).toBe(true);
    });
  });

  // ─── AC6: Success feedback after player creation ───
  describe("AC6: Success feedback after player creation", () => {
    it("Success feedback after player creation shows toast and navigates to player profile", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC6F${Date.now()}`;

      // Fill required fields and submit to create a player
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "FeedbackTest",
        position: "Midfielder",
      });
      await ctx.stagehand.page.waitForTimeout(3000);

      // After successful player creation, a success toast notification must appear
      const feedback = await ctx.stagehand.page.extract({
        instruction:
          "look for a toast notification, snackbar, or success message anywhere on the page. Extract the exact text and whether it is visible.",
        schema: z.object({
          toastText: z.string(),
          hasSuccessToast: z.boolean(),
        }),
      });

      // Success toast must appear with the word "created"
      expect(feedback.hasSuccessToast).toBe(true);
      expect(feedback.toastText.toLowerCase()).toContain("created");

      // Dismiss any invite dialog so navigation completes
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the 'Got it' or 'Skip' button"
        );
        await ctx.stagehand.page.waitForTimeout(1500);
      } catch {
        // No dialog
      }

      await ctx.stagehand.page.waitForTimeout(1500);

      // After player creation, admin must be navigated away from /players/new
      const finalUrl = ctx.stagehand.page.url();
      expect(finalUrl).not.toContain("/players/new");
      expect(finalUrl).toContain("/players");
    });
  });

  // ─── AC7: Admin is prompted to send an account invitation ───
  describe("AC7: Admin is prompted to send an account invitation", () => {
    it("Admin is prompted to send invitation after player creation — without email shows Got it button", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `NoEm${Date.now()}`;

      // Fill form WITHOUT email — triggers no-email invite dialog
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "NoEmailTest",
        position: "Defender",
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // After player creation, admin should see an invitation dialog
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "check if a dialog or modal is visible on the page. Look for text about inviting the player, no email address, or sending an account invitation. Also look for buttons like 'Got it', 'Skip', or 'Send Invite'. Extract the dialog title, message, and button labels.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      // Admin must be shown the invitation prompt dialog
      expect(dialog.isDialogVisible).toBe(true);

      // Without email — dialog should have "Got it" button
      const allText =
        `${dialog.dialogTitle} ${dialog.dialogMessage} ${dialog.buttonLabels.join(" ")}`.toLowerCase();
      expect(allText).toMatch(/no email|got it/);
      expect(
        dialog.buttonLabels.some((b) => b.toLowerCase().includes("got it"))
      ).toBe(true);
    });

    it("Admin is prompted to send invitation after player creation — with email shows Send Invite and Skip", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `WEm${Date.now()}`;

      // Fill form WITH email — triggers email invite dialog
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "EmailTest",
        position: "Goalkeeper",
        email: `${uniqueName}@test.example.com`,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // After player creation, admin should see the invite dialog
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

      // Admin must be prompted with the invitation dialog
      expect(dialog.isDialogVisible).toBe(true);

      // With email — dialog should offer "Send Invite" and "Skip" buttons
      const btnLabels = dialog.buttonLabels.map((b) => b.toLowerCase());
      expect(
        btnLabels.some((b) => b.includes("send") || b.includes("invite"))
      ).toBe(true);
      expect(btnLabels.some((b) => b.includes("skip"))).toBe(true);

      // Dialog message should reference invitation or email
      const msgLower =
        `${dialog.dialogTitle} ${dialog.dialogMessage}`.toLowerCase();
      expect(msgLower).toMatch(/invit|email|account/);
    });
  });

  // ─── AC8: invitePlayer mutation sends an account invitation ───
  describe("AC8: invitePlayer mutation sends an account invitation", () => {
    it("clicking Send Invite triggers the invitePlayer mutation and shows confirmation toast", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC8I${Date.now()}`;
      const testEmail = `${uniqueName}@test.example.com`;

      // Create a player with email to trigger the invite dialog
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "InvMut",
        position: "Midfielder",
        email: testEmail,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // The invite dialog should be open — click "Send Invite"
      await ctx.stagehand.page.act(
        "click the 'Send Invite' button in the dialog"
      );
      await ctx.stagehand.page.waitForTimeout(3000);

      // After invitePlayer mutation, a confirmation toast should appear
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
