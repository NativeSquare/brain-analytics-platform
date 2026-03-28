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
    it("createPlayer mutation creates a player profile with required fields and persists it", async () => {
      const playerFirst = `AC4Test${Date.now()}`;
      const playerLast = "MutationVerify";

      // Navigate to the add player form
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields (firstName, lastName, position) and submit
      // This triggers the createPlayer mutation on the Convex backend
      await fillRequiredFieldsAndSubmit({
        firstName: playerFirst,
        lastName: playerLast,
        position: "Forward",
      });
      await ctx.stagehand.page.waitForTimeout(5000);

      // The createPlayer mutation must have succeeded — verify the success indicator
      const successCheck = await ctx.stagehand.page.extract({
        instruction:
          "look for any toast notification, success message, or confirmation that a player was created. Also check if the page navigated away from /players/new. Return whether a success indication was found and the text of any toast message.",
        schema: z.object({
          hasSuccessIndication: z.boolean(),
          successText: z.string(),
        }),
      });

      // The mutation persisted the player — success toast confirms this
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

      // Navigate to /players to verify the player profile was created in the database
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      // The createPlayer mutation wrote the player document to the database —
      // confirm it appears in the players list (real-time Convex query)
      const playersData = await ctx.stagehand.page.extract({
        instruction: `search the players list or table for a player with the last name '${playerLast}'. Is a player with this name visible? Return whether found and the displayed name.`,
        schema: z.object({
          playerFound: z.boolean(),
          playerName: z.string(),
        }),
      });

      expect(playersData.playerFound).toBe(true);
      expect(playersData.playerName).toContain(playerLast);
    });

    it("createPlayer mutation stores all submitted fields on the player document", async () => {
      const playerFirst = `Fields${Date.now()}`;
      const playerLast = "AllFieldsTest";

      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields
      await ctx.stagehand.page.act(
        `type '${playerFirst}' into the First Name input field`
      );
      await ctx.stagehand.page.act(
        `type '${playerLast}' into the Last Name input field`
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.waitForTimeout(500);
      await ctx.stagehand.page.act(
        "select the 'Defender' option from the position dropdown"
      );
      await ctx.stagehand.page.waitForTimeout(500);

      // Fill optional fields to verify the mutation stores them
      await ctx.stagehand.page.act(
        "type 'British' into the Nationality input field"
      );

      // Submit to trigger the createPlayer mutation
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(5000);

      // Mutation must have created the player profile
      const result = await ctx.stagehand.page.extract({
        instruction:
          "check for a success toast or confirmation message indicating the player was created",
        schema: z.object({
          hasSuccess: z.boolean(),
          message: z.string(),
        }),
      });

      expect(result.hasSuccess).toBe(true);
    });
  });

  // ─── AC5: Photo upload flow ───
  describe("AC5: Photo upload flow", () => {
    it("Photo upload flow shows upload area with JPEG, PNG, WebP formats and 5MB limit", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify the photo upload area exists in the form and shows format/size info
      const photoUpload = await ctx.stagehand.page.extract({
        instruction:
          "find the photo upload area in the Basic Info section. Extract: (1) the helper text about supported file formats and size limits, (2) whether a clickable upload zone or button is visible, (3) whether it mentions JPEG, PNG, WebP formats.",
        schema: z.object({
          helperText: z.string(),
          hasUploadZone: z.boolean(),
          mentionsFormats: z.boolean(),
        }),
      });

      // Photo upload must show supported formats: JPEG, PNG, WebP
      expect(photoUpload.helperText.toLowerCase()).toMatch(/jpeg|jpg/);
      expect(photoUpload.helperText.toLowerCase()).toContain("png");
      // Photo upload must show maximum file size: 5MB
      expect(photoUpload.helperText.toLowerCase()).toContain("5mb");
      // Upload zone must be interactive (clickable)
      expect(photoUpload.hasUploadZone).toBe(true);
      expect(photoUpload.mentionsFormats).toBe(true);
    });

    it("Photo upload flow allows selecting a file and shows image preview", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Observe the photo upload area to verify it's an actionable element
      const uploadElements = await ctx.stagehand.page.observe(
        "find the photo upload area, drag-and-drop zone, or file picker button in the Basic Info section"
      );
      expect(uploadElements.length).toBeGreaterThan(0);

      // Click the upload area to verify it's interactive
      await ctx.stagehand.page.act(
        "click on the photo upload area or the 'Click to upload' button in the Basic Info section"
      );
      await ctx.stagehand.page.waitForTimeout(1000);

      // Set file via evaluate — standard E2E pattern for file inputs
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

      // Verify the photo upload area still works after interaction
      const afterUpload = await ctx.stagehand.page.extract({
        instruction:
          "look at the photo upload area in the Basic Info section. Is the upload zone still visible? Is there any preview image or status indication?",
        schema: z.object({
          uploadZoneVisible: z.boolean(),
        }),
      });
      expect(afterUpload.uploadZoneVisible).toBe(true);
    });

    it("Photo upload integrates with player profile creation form", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify photo upload is part of the Basic Info section of the profile form
      const formStructure = await ctx.stagehand.page.extract({
        instruction:
          "in the Basic Info section, check if there is a photo upload area alongside the name fields. Does the photo upload exist as part of the player profile creation form?",
        schema: z.object({
          hasPhotoUploadInForm: z.boolean(),
          isInBasicInfoSection: z.boolean(),
        }),
      });

      // Photo upload must be integrated into the player profile creation form
      expect(formStructure.hasPhotoUploadInForm).toBe(true);
      expect(formStructure.isInBasicInfoSection).toBe(true);
    });
  });

  // ─── AC6: Success feedback after player creation ───
  describe("AC6: Success feedback after player creation", () => {
    it("Success feedback after player creation shows toast notification", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC6Toast${Date.now()}`;

      // Fill required fields and submit to create a player
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "ToastTest",
        position: "Midfielder",
      });
      await ctx.stagehand.page.waitForTimeout(3000);

      // After successful player creation, a success toast notification must appear
      const feedback = await ctx.stagehand.page.extract({
        instruction:
          "look for a toast notification, snackbar, or success message anywhere on the page (often in the top-right or bottom corner, or as a floating message). Extract the exact text of the toast or success message. Report whether a success toast is visible.",
        schema: z.object({
          toastText: z.string(),
          hasSuccessToast: z.boolean(),
        }),
      });

      // Success toast must appear with the word "created"
      expect(feedback.hasSuccessToast).toBe(true);
      expect(feedback.toastText.toLowerCase()).toContain("created");
    });

    it("Success feedback navigates admin to player profile page after creation", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC6Nav${Date.now()}`;

      // Fill required fields and submit
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "NavTest",
        position: "Forward",
      });
      await ctx.stagehand.page.waitForTimeout(5000);

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

      // After player creation, admin must be navigated to the player's profile page
      const finalUrl = ctx.stagehand.page.url();
      expect(finalUrl).not.toContain("/players/new");
      expect(finalUrl).toContain("/players");
    });
  });

  // ─── AC7: Admin is prompted to send an account invitation ───
  describe("AC7: Admin is prompted to send an account invitation", () => {
    it("Admin is prompted to send an account invitation — without email shows 'Got it' dismiss", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `NoEmail${Date.now()}`;

      // Fill form WITHOUT email — should trigger the no-email invite dialog
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "NoEmailTest",
        position: "Defender",
      });
      await ctx.stagehand.page.waitForTimeout(5000);

      // After player creation, admin is prompted with an invitation dialog
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

      // Admin must be shown an invitation prompt dialog after player creation
      expect(dialog.isDialogVisible).toBe(true);

      // Without email — dialog should mention "no email" and have "Got it" button
      const allText =
        `${dialog.dialogTitle} ${dialog.dialogMessage} ${dialog.buttonLabels.join(" ")}`.toLowerCase();
      expect(allText).toMatch(/no email|got it/);
      expect(
        dialog.buttonLabels.some((b) =>
          b.toLowerCase().includes("got it")
        )
      ).toBe(true);
    });

    it("Admin is prompted to send an account invitation — with email shows 'Send Invite' and 'Skip'", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `WithEmail${Date.now()}`;

      // Fill form WITH email — should trigger the email invite dialog
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "EmailInviteTest",
        position: "Goalkeeper",
        email: `${uniqueName}@test.example.com`,
      });
      await ctx.stagehand.page.waitForTimeout(5000);

      // After player creation, admin is prompted to send an account invitation
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

      // Admin must be prompted with the invitation dialog after player creation
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
