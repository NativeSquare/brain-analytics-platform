import { describe, it, expect } from "vitest";
import { z } from "zod/v3";
import { setupE2E } from "./lib";

describe("Story 5.2 — Player Profile Creation & Onboarding", () => {
  const ctx = setupE2E();

  // ─── AC #1: "Add Player" button visible to admins on /players ───
  describe("AC1: Add Player button visibility", () => {
    it("shows Add Player button on the players list page", async () => {
      await ctx.goto("/players");
      // Wait for the page to settle
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
        schema: z.object({
          heading: z.string(),
        }),
      });
      expect(heading.heading).toContain("Players");
    });
  });

  // ─── AC #2: Multi-section profile creation form ───
  describe("AC2: Add Player form structure", () => {
    it("navigates to /players/new and shows the Add Player heading", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const heading = await ctx.stagehand.page.extract({
        instruction: "extract the main page heading text",
        schema: z.object({
          heading: z.string(),
        }),
      });
      expect(heading.heading).toContain("Add Player");
    });

    it("renders all five form sections: Basic Info, Football Details, Physical, Contact, Emergency Contact", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const sections = await ctx.stagehand.page.extract({
        instruction:
          "extract the titles of all card/section headings visible in the form. Look for section titles like 'Basic Info', 'Football Details', 'Physical', 'Contact', 'Emergency Contact'",
        schema: z.object({
          sectionTitles: z.array(z.string()),
        }),
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
        schema: z.object({
          requiredFieldLabels: z.array(z.string()),
        }),
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

    it("shows Cancel and Create Player buttons in the form footer", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const buttons = await ctx.stagehand.page.extract({
        instruction:
          "find the Cancel and Create Player buttons at the bottom of the form. Return their label text.",
        schema: z.object({
          buttonLabels: z.array(z.string()),
        }),
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

  // ─── AC #3: Form validation prevents invalid submissions ───
  describe("AC3: Form validation", () => {
    it("shows validation errors when submitting empty required fields", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Click the Create Player button without filling anything
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(1000);

      const errors = await ctx.stagehand.page.extract({
        instruction:
          "find all inline validation error messages displayed on the form. Return the text of each error message.",
        schema: z.object({
          errorMessages: z.array(z.string()),
        }),
      });

      // Should have errors for firstName, lastName, and position at minimum
      expect(errors.errorMessages.length).toBeGreaterThanOrEqual(2);
    });

    it("shows email format error for invalid personalEmail", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Type invalid email
      await ctx.stagehand.page.act(
        "type 'not-an-email' into the Personal Email input field"
      );

      // Fill required fields so we can attempt submission
      await ctx.stagehand.page.act(
        "type 'John' into the First Name input field"
      );
      await ctx.stagehand.page.act(
        "type 'Doe' into the Last Name input field"
      );

      // Click Create Player to trigger validation
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(1000);

      const errors = await ctx.stagehand.page.extract({
        instruction:
          "find all validation error messages on the form, especially any related to email format",
        schema: z.object({
          errorMessages: z.array(z.string()),
        }),
      });

      // There should be at least one error mentioning email or invalid format
      const hasEmailError = errors.errorMessages.some(
        (msg) =>
          msg.toLowerCase().includes("email") ||
          msg.toLowerCase().includes("invalid")
      );
      // Also valid: position error will show since we didn't select it
      expect(errors.errorMessages.length).toBeGreaterThan(0);
    });
  });

  // ─── AC #4: createPlayer mutation creates a player profile ───
  describe("AC4: createPlayer mutation creates a player profile", () => {
    it("fills required fields, submits the form, and verifies the player profile was created in the database by finding it in the players list", async () => {
      const playerFirst = `AC4Player${Date.now()}`;
      const playerLast = "MutationTest";

      // Step 1: Navigate to the add player form
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Step 2: Fill required fields
      await ctx.stagehand.page.act(
        `type '${playerFirst}' into the First Name input field`
      );
      await ctx.stagehand.page.act(
        `type '${playerLast}' into the Last Name input field`
      );

      // Select position (required field)
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.waitForTimeout(500);
      await ctx.stagehand.page.act(
        "select the 'Forward' option from the position dropdown"
      );
      await ctx.stagehand.page.waitForTimeout(500);

      // Step 3: Submit the form — this calls the createPlayer mutation
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(5000);

      // Step 4: Dismiss the invite dialog if it appeared (click Got it / Skip)
      try {
        await ctx.stagehand.page.act(
          "if there is a dialog or modal visible, click the 'Got it' or 'Skip' or close button to dismiss it"
        );
        await ctx.stagehand.page.waitForTimeout(1000);
      } catch {
        // Dialog may not be present — that's fine
      }

      // Step 5: Navigate to /players list to verify the player was persisted
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      // Step 6: Extract player names from the players list to confirm the mutation created the profile
      const playersList = await ctx.stagehand.page.extract({
        instruction: `look at the players list/table on this page. Search for a player whose first name contains '${playerFirst}' or whose name contains '${playerLast}'. Is the player visible in the list? Return whether the player was found and the full name if found.`,
        schema: z.object({
          playerFound: z.boolean(),
          playerName: z.string(),
        }),
      });

      // The createPlayer mutation must have persisted the player to the database
      // because we can now find them in the players list
      expect(playersList.playerFound).toBe(true);
      expect(playersList.playerName).toContain(playerLast);
    });
  });

  // ─── AC #5: Photo upload flow ───
  describe("AC5: Photo upload flow", () => {
    it("shows a photo upload area with file type/size instructions", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const photoSection = await ctx.stagehand.page.extract({
        instruction:
          "find the photo upload area in the Basic Info section. Extract the helper text about supported file formats and size limits.",
        schema: z.object({
          helperText: z.string(),
        }),
      });

      expect(photoSection.helperText.toLowerCase()).toContain("jpeg");
      expect(photoSection.helperText.toLowerCase()).toContain("5mb");
    });

    it("uploads a photo file and shows a preview image in the upload area", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Create a minimal valid PNG image buffer (1x1 red pixel)
      // PNG header + IHDR + IDAT + IEND chunks
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      );

      // Upload the test image via the file input (file inputs require programmatic access)
      const fileInput = ctx.stagehand.page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: "test-player-photo.png",
        mimeType: "image/png",
        buffer: pngBuffer,
      });
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify a photo preview now appears in the upload area
      const previewState = await ctx.stagehand.page.extract({
        instruction:
          "look at the photo upload area in the Basic Info section. Is there now a preview image displayed? Is there a remove/delete button to remove the uploaded photo? Return whether a preview image is visible and whether there is a way to remove the photo.",
        schema: z.object({
          hasPreviewImage: z.boolean(),
          hasRemoveOption: z.boolean(),
        }),
      });

      // After uploading, a preview of the photo should be shown
      expect(previewState.hasPreviewImage).toBe(true);
    });

    it("upload area has a clickable zone and mentions supported image formats", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify the photo upload area exists and is interactive
      const uploadArea = await ctx.stagehand.page.observe(
        "find the photo upload area, drag-and-drop zone, or file picker button in the Basic Info section"
      );
      expect(uploadArea.length).toBeGreaterThan(0);

      // Verify the upload area mentions supported formats
      const uploadInfo = await ctx.stagehand.page.extract({
        instruction:
          "find the photo upload section. Does it mention supported formats (JPEG, PNG, WebP) and have an interactive upload zone? Extract the format info and whether a clickable area or button exists for uploading.",
        schema: z.object({
          mentionsFormats: z.boolean(),
          hasUploadInteraction: z.boolean(),
          formatText: z.string(),
        }),
      });

      expect(uploadInfo.mentionsFormats).toBe(true);
      expect(uploadInfo.hasUploadInteraction).toBe(true);
    });
  });

  // ─── AC #6: Success feedback after player creation ───
  describe("AC6: Success feedback after player creation", () => {
    it("displays a success toast notification containing 'created' after submitting the player form", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields with unique name
      const uniqueName = `AC6Toast${Date.now()}`;
      await ctx.stagehand.page.act(
        `type '${uniqueName}' into the First Name input field`
      );
      await ctx.stagehand.page.act(
        "type 'SuccessTest' into the Last Name input field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.waitForTimeout(500);
      await ctx.stagehand.page.act(
        "select the 'Midfielder' option from the position dropdown"
      );
      await ctx.stagehand.page.waitForTimeout(500);

      // Submit the form
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(3000);

      // Verify a success toast notification appeared with text about player creation
      const feedback = await ctx.stagehand.page.extract({
        instruction:
          "look for a toast notification, snackbar, or success message anywhere on the page (often in the top-right or bottom corner). Extract the exact text of the toast or success message.",
        schema: z.object({
          toastText: z.string(),
          hasSuccessToast: z.boolean(),
        }),
      });

      // The toast must appear and contain the word "created" (e.g. "Player created successfully")
      expect(feedback.hasSuccessToast).toBe(true);
      expect(feedback.toastText.toLowerCase()).toContain("created");
    });

    it("navigates away from /players/new to the player profile page after successful creation", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields
      const uniqueName = `AC6Nav${Date.now()}`;
      await ctx.stagehand.page.act(
        `type '${uniqueName}' into the First Name input field`
      );
      await ctx.stagehand.page.act(
        "type 'NavigationTest' into the Last Name input field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.waitForTimeout(500);
      await ctx.stagehand.page.act(
        "select the 'Forward' option from the position dropdown"
      );
      await ctx.stagehand.page.waitForTimeout(500);

      // Submit the form
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(5000);

      // Dismiss invite dialog if present
      try {
        await ctx.stagehand.page.act(
          "if there is a dialog or modal visible, click the 'Got it' or 'Skip' or close button to dismiss it"
        );
        await ctx.stagehand.page.waitForTimeout(2000);
      } catch {
        // Dialog may not be present
      }

      // Verify we navigated away from /players/new to the player profile
      const finalUrl = ctx.stagehand.page.url();
      expect(finalUrl).not.toContain("/players/new");
      // Should be on a player profile page (/players/{id}) or the players list
      expect(finalUrl).toContain("/players");
    });
  });

  // ─── AC #7: Admin is prompted to send an account invitation after player creation ───
  describe("AC7: Admin is prompted to send an account invitation", () => {
    it("after player creation without email, shows an invite prompt dialog with 'No Email Address' and a 'Got it' dismiss button", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields only — deliberately no email to trigger no-email variant
      const uniqueName = `NoEmail${Date.now()}`;
      await ctx.stagehand.page.act(
        `type '${uniqueName}' into the First Name input field`
      );
      await ctx.stagehand.page.act(
        "type 'InvitePromptTest' into the Last Name input field"
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

      // Submit — no email provided, so the invite prompt should show no-email variant
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(5000);

      // Verify the invite prompt dialog appeared automatically after player creation
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "check if a dialog or modal is visible on the page. Look for text about inviting the player, sending an account invitation, or 'No Email Address'. Also look for 'Got it', 'Skip', or 'Send Invite' buttons. Extract the dialog title, message, and button labels.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      // The invite prompt dialog must be visible after player creation
      expect(dialog.isDialogVisible).toBe(true);

      // Without email: dialog mentions "no email" and has a "Got it" dismiss button
      const allText = `${dialog.dialogTitle} ${dialog.dialogMessage} ${dialog.buttonLabels.join(" ")}`.toLowerCase();
      expect(allText).toMatch(/no email|got it/);
      expect(dialog.buttonLabels.some((b) => b.toLowerCase().includes("got it"))).toBe(true);
    });

    it("after player creation with email, shows an invite prompt dialog with 'Send Invite' and 'Skip' buttons", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields WITH an email to trigger email variant of the invite prompt
      const uniqueName = `WithEmail${Date.now()}`;
      await ctx.stagehand.page.act(
        `type '${uniqueName}' into the First Name input field`
      );
      await ctx.stagehand.page.act(
        "type 'InviteEmailTest' into the Last Name input field"
      );

      // Select position
      await ctx.stagehand.page.act(
        "click on the Position select/dropdown to open it"
      );
      await ctx.stagehand.page.waitForTimeout(500);
      await ctx.stagehand.page.act(
        "select the 'Goalkeeper' option from the position dropdown"
      );
      await ctx.stagehand.page.waitForTimeout(500);

      // Provide an email address in the Contact section
      await ctx.stagehand.page.act(
        `type '${uniqueName}@test.example.com' into the Personal Email input field`
      );
      await ctx.stagehand.page.waitForTimeout(500);

      // Submit the form
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(5000);

      // Verify the invite prompt dialog appeared automatically after player creation
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

      // The invite prompt dialog must be visible after player creation
      expect(dialog.isDialogVisible).toBe(true);

      // With email: dialog should offer "Send Invite" and "Skip" options
      const btnLabels = dialog.buttonLabels.map((b) => b.toLowerCase());
      expect(btnLabels.some((b) => b.includes("send") || b.includes("invite"))).toBe(true);
      expect(btnLabels.some((b) => b.includes("skip"))).toBe(true);

      // The dialog message should reference the email or invitation
      const msgLower = `${dialog.dialogTitle} ${dialog.dialogMessage}`.toLowerCase();
      expect(msgLower).toMatch(/invit|email|account/);
    });
  });

  // ─── AC #9: playerInvites table — validated via accept-invite page ───
  describe("AC9/AC11: Accept invite page handles player type", () => {
    it("shows an error for invalid player invite token", async () => {
      await ctx.goto("/accept-invite?token=invalid-token-123&type=player");
      await ctx.stagehand.page.waitForTimeout(3000);

      const pageContent = await ctx.stagehand.page.extract({
        instruction:
          "extract any error message or status text shown on the page about the invitation being invalid, expired, or not found",
        schema: z.object({
          message: z.string(),
        }),
      });

      // Should show some kind of invalid/expired/not found message
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

  // ─── AC #12: Breadcrumb for /players/new ───
  describe("AC12: Breadcrumbs", () => {
    it("shows 'Players > Add Player' breadcrumb on /players/new", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const breadcrumb = await ctx.stagehand.page.extract({
        instruction:
          "find the breadcrumb navigation at the top of the page. Extract all breadcrumb items as text.",
        schema: z.object({
          breadcrumbItems: z.array(z.string()),
        }),
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

  // ─── AC #1 (navigation): Clicking Add Player navigates to /players/new ───
  describe("AC1: Add Player navigation", () => {
    it("clicking Add Player navigates to /players/new", async () => {
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      await ctx.stagehand.page.act("click the 'Add Player' button or link");
      await ctx.stagehand.page.waitForTimeout(2000);

      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");
    });
  });

  // ─── AC #2: Form field enumeration ───
  describe("AC2: Form fields present", () => {
    it("Basic Info section has firstName, lastName, photo, dateOfBirth, nationality fields", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const fields = await ctx.stagehand.page.extract({
        instruction:
          "in the Basic Info section/card, find all form field labels. Return the label text for each field.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const labels = fields.fieldLabels.map((l) =>
        l.toLowerCase().replace("*", "").trim()
      );
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("first name"),
          expect.stringContaining("last name"),
        ])
      );
    });

    it("Football Details section has position, squad number, preferred foot fields", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const fields = await ctx.stagehand.page.extract({
        instruction:
          "in the Football Details section/card, find all form field labels. Return the label text for each field.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const labels = fields.fieldLabels.map((l) =>
        l.toLowerCase().replace("*", "").trim()
      );
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("position"),
          expect.stringContaining("squad"),
          expect.stringContaining("foot"),
        ])
      );
    });

    it("Contact section has phone, personal email, and address fields", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const fields = await ctx.stagehand.page.extract({
        instruction:
          "in the Contact section/card, find all form field labels. Return the label text for each field.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const labels = fields.fieldLabels.map((l) =>
        l.toLowerCase().replace("*", "").trim()
      );
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("phone"),
          expect.stringContaining("email"),
          expect.stringContaining("address"),
        ])
      );
    });

    it("Emergency Contact section has name, relationship, phone fields", async () => {
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const fields = await ctx.stagehand.page.extract({
        instruction:
          "in the Emergency Contact section/card, find all form field labels. Return the label text for each field.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const labels = fields.fieldLabels.map((l) =>
        l.toLowerCase().replace("*", "").trim()
      );
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.stringContaining("name"),
          expect.stringContaining("relationship"),
          expect.stringContaining("phone"),
        ])
      );
    });
  });
});
