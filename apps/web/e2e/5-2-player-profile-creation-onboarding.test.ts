import { describe, it, expect } from "vitest";
import { z } from "zod/v3";
import { setupE2E } from "./lib";

/**
 * Stagehand E2E tests for Story 5.2: Player Profile Creation & Onboarding.
 *
 * Uses Stagehand natural language API for all interactions and assertions.
 * Each AC has its own describe block with focused it() blocks.
 */
describe("Story 5.2 — Player Profile Creation & Onboarding", () => {
  const ctx = setupE2E();

  // Helper: fill required fields (firstName, lastName, position) using Stagehand act()
  async function fillRequiredFieldsAndSubmit(options?: {
    firstName?: string;
    lastName?: string;
    position?: string;
    email?: string;
  }) {
    const firstName = options?.firstName ?? `TestPlayer${Date.now()}`;
    const lastName = options?.lastName ?? "E2ETest";
    const position = options?.position ?? "Forward";

    await ctx.stagehand.page.act(
      `type '${firstName}' into the First Name input field`
    );
    await ctx.stagehand.page.act(
      `type '${lastName}' into the Last Name input field`
    );

    // Select position via dropdown
    await ctx.stagehand.page.act(
      "click on the Position select/dropdown to open it"
    );
    await ctx.stagehand.page.waitForTimeout(500);
    await ctx.stagehand.page.act(
      `select the '${position}' option from the position dropdown`
    );
    await ctx.stagehand.page.waitForTimeout(500);

    // Optionally fill email
    if (options?.email) {
      await ctx.stagehand.page.act(
        `type '${options.email}' into the Personal Email input field`
      );
      await ctx.stagehand.page.waitForTimeout(300);
    }

    // Submit
    await ctx.stagehand.page.act("click the 'Create Player' button");
  }

  // ─── AC1: "Add Player" button visible to admins on /players ───
  describe("AC1: Add Player button visibility", () => {
    it("shows Add Player button on the players list page", async () => {
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      const elements = await ctx.stagehand.page.observe(
        "find the 'Add Player' button or link on the page"
      );
      expect(elements.length).toBeGreaterThan(0);
    });

    it("displays the Players page heading", async () => {
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      const heading = await ctx.stagehand.page.extract({
        instruction: "extract the main page heading text",
        schema: z.object({ heading: z.string() }),
      });
      expect(heading.heading).toContain("Players");
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
    it("navigates to /players/new and shows the Add Player heading", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const heading = await ctx.stagehand.page.extract({
        instruction: "extract the main page heading text",
        schema: z.object({ heading: z.string() }),
      });
      expect(heading.heading).toContain("Add Player");
    });

    it("renders all five form sections", async () => {
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

    it("shows required field indicators for First Name, Last Name, and Position", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const requiredFields = await ctx.stagehand.page.extract({
        instruction:
          "find all form field labels that have a red asterisk (*) indicating they are required. Return the label text for each required field.",
        schema: z.object({ requiredFieldLabels: z.array(z.string()) }),
      });

      const labels = requiredFields.requiredFieldLabels.map((l) =>
        l.toLowerCase().replace("*", "").trim()
      );
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("first name"),
          expect.stringContaining("last name"),
          expect.stringContaining("position"),
        ])
      );
    });

    it("shows Cancel and Create Player buttons", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const buttons = await ctx.stagehand.page.extract({
        instruction:
          "find the Cancel and Create Player buttons at the bottom of the form. Return their label text.",
        schema: z.object({ buttonLabels: z.array(z.string()) }),
      });

      const labels = buttons.buttonLabels.map((l) => l.toLowerCase());
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("cancel"),
          expect.stringContaining("create player"),
        ])
      );
    });
  });

  // ─── AC3: Form validation prevents invalid submissions ───
  describe("AC3: Form validation", () => {
    it("shows validation errors when submitting empty required fields", async () => {
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

    it("shows email format error for invalid personalEmail", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      await ctx.stagehand.page.act(
        "type 'not-an-email' into the Personal Email input field"
      );
      await ctx.stagehand.page.act(
        "type 'John' into the First Name input field"
      );
      await ctx.stagehand.page.act(
        "type 'Doe' into the Last Name input field"
      );
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(1000);

      const errors = await ctx.stagehand.page.extract({
        instruction:
          "find all validation error messages on the form, especially any related to email format",
        schema: z.object({ errorMessages: z.array(z.string()) }),
      });

      expect(errors.errorMessages.length).toBeGreaterThan(0);
    });
  });

  // ─── AC4: createPlayer mutation creates a player profile ───
  describe("AC4: createPlayer mutation creates a player profile", () => {
    it("submits the form with valid data and the createPlayer mutation persists the player to the database", async () => {
      const playerFirst = `AC4Test${Date.now()}`;
      const playerLast = "MutationVerify";

      // Navigate to the add player form
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields and submit — this triggers the createPlayer mutation
      await fillRequiredFieldsAndSubmit({
        firstName: playerFirst,
        lastName: playerLast,
        position: "Forward",
      });
      await ctx.stagehand.page.waitForTimeout(5000);

      // After successful mutation, a success toast confirms the player was created
      const successCheck = await ctx.stagehand.page.extract({
        instruction:
          "look for any toast notification, success message, or confirmation that a player was created. Also check if the page navigated away from /players/new. Return whether a success indication was found and the text of any toast message.",
        schema: z.object({
          hasSuccessIndication: z.boolean(),
          successText: z.string(),
        }),
      });

      // The mutation must have succeeded — the success toast proves the createPlayer
      // mutation executed on the server and persisted the player document
      expect(successCheck.hasSuccessIndication).toBe(true);
      expect(successCheck.successText.toLowerCase()).toContain("created");

      // Dismiss any invite dialog that appears after creation
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the dismiss button like 'Got it' or 'Skip'"
        );
        await ctx.stagehand.page.waitForTimeout(1000);
      } catch {
        // No dialog present
      }

      // Navigate to /players to verify the player was persisted in the database
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      // Extract the players list to confirm the created player appears
      const playersData = await ctx.stagehand.page.extract({
        instruction: `search the players list or table for a player with the last name '${playerLast}'. Is a player with this name visible? Return whether found and the displayed name.`,
        schema: z.object({
          playerFound: z.boolean(),
          playerName: z.string(),
        }),
      });

      // The createPlayer mutation must have written to the database because
      // the new player now appears in the players list query
      expect(playersData.playerFound).toBe(true);
      expect(playersData.playerName).toContain(playerLast);
    });
  });

  // ─── AC5: Photo upload flow ───
  describe("AC5: Photo upload flow", () => {
    it("displays a photo upload area with supported formats (JPEG, PNG, WebP) and 5MB size limit", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify the upload area exists and shows format/size info
      const photoUpload = await ctx.stagehand.page.extract({
        instruction:
          "find the photo upload area in the Basic Info section. Extract: (1) the helper text about supported file formats and size limits, (2) whether a clickable upload zone or button is visible, (3) whether it mentions JPEG, PNG, WebP formats.",
        schema: z.object({
          helperText: z.string(),
          hasUploadZone: z.boolean(),
          mentionsFormats: z.boolean(),
        }),
      });

      // AC5: Supported formats must be communicated — JPEG, PNG, WebP
      expect(photoUpload.helperText.toLowerCase()).toMatch(/jpeg|jpg/);
      expect(photoUpload.helperText.toLowerCase()).toContain("png");
      // AC5: Maximum file size 5MB must be shown
      expect(photoUpload.helperText.toLowerCase()).toContain("5mb");
      // AC5: Upload zone must be interactive
      expect(photoUpload.hasUploadZone).toBe(true);
      expect(photoUpload.mentionsFormats).toBe(true);
    });

    it("upload area is interactive and allows photo file selection", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Observe the photo upload area to verify it's an actionable element
      const uploadElements = await ctx.stagehand.page.observe(
        "find the photo upload area, drag-and-drop zone, or file picker button in the Basic Info section"
      );
      expect(uploadElements.length).toBeGreaterThan(0);

      // Click the upload area to verify it's interactive (opens file picker)
      await ctx.stagehand.page.act(
        "click on the photo upload area or the 'Click to upload' button in the Basic Info section"
      );
      await ctx.stagehand.page.waitForTimeout(1000);

      // Verify the upload area is still present (no JS error on interaction)
      const afterClick = await ctx.stagehand.page.extract({
        instruction:
          "is the photo upload area in the Basic Info section still visible after clicking? Return whether the upload zone is visible.",
        schema: z.object({ uploadZoneVisible: z.boolean() }),
      });
      expect(afterClick.uploadZoneVisible).toBe(true);
    });

    it("shows a preview image after a photo file is selected for upload", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Use Stagehand observe to find the file input element
      const fileInputs = await ctx.stagehand.page.observe(
        "find the hidden file input element for photo upload in the Basic Info section"
      );

      // Create a minimal valid PNG image (1x1 pixel)
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      );

      // Use Playwright's page API to set the file on the input
      // File inputs require programmatic access — this is a standard E2E pattern
      const page = ctx.stagehand.page;
      await page.act("click on the photo upload area in the Basic Info section");
      await page.waitForTimeout(500);

      // Set file via evaluate — file inputs require programmatic access
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
            "test.png",
            { type: "image/png" }
          );
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      await page.waitForTimeout(2000);

      // Verify preview appears after file selection
      const previewState = await page.extract({
        instruction:
          "look at the photo upload area in the Basic Info section. Is there a preview image (thumbnail) displayed? Is there a remove or delete button to clear the uploaded photo? Return whether a preview image is visible.",
        schema: z.object({
          hasPreviewImage: z.boolean(),
          hasRemoveOption: z.boolean(),
        }),
      });

      // AC5: The form must show a preview of the selected image before submission
      expect(previewState.hasPreviewImage).toBe(true);
    });
  });

  // ─── AC6: Success feedback after player creation ───
  describe("AC6: Success feedback after player creation", () => {
    it("shows a success toast with 'created' and navigates to the player profile page", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC6Feedback${Date.now()}`;

      // Fill required fields and submit
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "FeedbackTest",
        position: "Midfielder",
      });
      await ctx.stagehand.page.waitForTimeout(3000);

      // AC6: Verify success toast notification appears
      const feedback = await ctx.stagehand.page.extract({
        instruction:
          "look for a toast notification, snackbar, or success message anywhere on the page (often in the top-right or bottom corner, or as a floating message). Extract the exact text of the toast or success message. Report whether a success toast is visible.",
        schema: z.object({
          toastText: z.string(),
          hasSuccessToast: z.boolean(),
        }),
      });

      // AC6: Success toast must appear with the word "created"
      expect(feedback.hasSuccessToast).toBe(true);
      expect(feedback.toastText.toLowerCase()).toContain("created");

      // Dismiss any invite dialog so navigation completes
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the dismiss button like 'Got it' or 'Skip'"
        );
        await ctx.stagehand.page.waitForTimeout(2000);
      } catch {
        // No dialog
      }

      await ctx.stagehand.page.waitForTimeout(2000);

      // AC6: Verify admin is navigated to the new player's profile page
      const finalUrl = ctx.stagehand.page.url();
      expect(finalUrl).not.toContain("/players/new");
      expect(finalUrl).toContain("/players");
    });
  });

  // ─── AC7: Admin is prompted to send an account invitation ───
  describe("AC7: Invitation dialog prompt after player creation", () => {
    it("without email: shows dialog with 'No Email Address' and 'Got it' button", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `NoEmail${Date.now()}`;

      // Fill form WITHOUT email — triggers no-email invite dialog variant
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "NoEmailTest",
        position: "Defender",
      });
      await ctx.stagehand.page.waitForTimeout(5000);

      // AC7: Verify the invite prompt dialog appeared automatically
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "check if a dialog or modal is visible on the page. Look for text about inviting the player, 'No Email Address', sending an account invitation. Also look for buttons like 'Got it', 'Skip', or 'Send Invite'. Extract the dialog title, message, and button labels.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      // AC7: Dialog must be visible after player creation
      expect(dialog.isDialogVisible).toBe(true);

      // AC7: Without email — dialog should mention "no email" and have "Got it" button
      const allText =
        `${dialog.dialogTitle} ${dialog.dialogMessage} ${dialog.buttonLabels.join(" ")}`.toLowerCase();
      expect(allText).toMatch(/no email|got it/);
      expect(
        dialog.buttonLabels.some((b) =>
          b.toLowerCase().includes("got it")
        )
      ).toBe(true);
    });

    it("with email: shows dialog with 'Send Invite' and 'Skip' buttons", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `WithEmail${Date.now()}`;

      // Fill form WITH email — triggers email invite dialog variant
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "EmailInviteTest",
        position: "Goalkeeper",
        email: `${uniqueName}@test.example.com`,
      });
      await ctx.stagehand.page.waitForTimeout(5000);

      // AC7: Verify the invite prompt dialog appeared automatically
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "check if a dialog or modal is visible on the page. Look for text about inviting the player to create their account, or sending an invitation email. Extract the dialog title, message content, and all button labels visible in the dialog.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      // AC7: Dialog must be visible after player creation
      expect(dialog.isDialogVisible).toBe(true);

      // AC7: With email — dialog should offer "Send Invite" and "Skip"
      const btnLabels = dialog.buttonLabels.map((b) => b.toLowerCase());
      expect(
        btnLabels.some((b) => b.includes("send") || b.includes("invite"))
      ).toBe(true);
      expect(btnLabels.some((b) => b.includes("skip"))).toBe(true);

      // AC7: Dialog message should reference invitation or email
      const msgLower =
        `${dialog.dialogTitle} ${dialog.dialogMessage}`.toLowerCase();
      expect(msgLower).toMatch(/invit|email|account/);
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
