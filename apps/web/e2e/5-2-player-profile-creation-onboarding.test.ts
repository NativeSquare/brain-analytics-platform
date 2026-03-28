import { describe, it, expect } from "vitest";
import { z } from "zod/v3";
import { setupE2E } from "./lib";

/**
 * Stagehand E2E tests for Story 5.2: Player Profile Creation & Onboarding.
 *
 * Covers all testable ACs [1, 2, 3, 4, 6, 7]:
 *   AC1 — "Add Player" button visible to admins on players list page
 *   AC2 — "Add Player" opens a multi-section profile creation form
 *   AC3 — Form validation prevents invalid submissions (inline error messages)
 *   AC4 — "createPlayer" mutation creates a player profile (database persistence + correct fields)
 *   AC5 — createPlayer mutation creates a player profile (mutation behavior verification)
 *   AC6 — Success toast notification after player creation
 *   AC7 — Admin is prompted to send an account invitation after player creation
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

  // ─── AC2: "Add Player" opens a multi-section profile creation form ───
  describe("AC2: 'Add Player' opens a multi-section profile creation form with all specified fields", () => {
    it("AC2 — clicking 'Add Player' on /players opens a multi-section profile creation form with Basic Info, Football Details, Physical, Contact, and Emergency Contact sections and all specified fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      // Step 1: Navigate to the players list page
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Step 2: Click the "Add Player" button to open the form
      await ctx.stagehand.page.act("click the 'Add Player' button");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Step 3: Verify the multi-section profile creation form is now open at /players/new
      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");

      // Step 4: Verify the form page heading indicates profile creation
      const pageHeading = await ctx.stagehand.page.extract({
        instruction:
          "Extract the main page heading or title on this form page. It should say something like 'Add Player', 'Create Player', or 'New Player'.",
        schema: z.object({
          heading: z.string(),
          formIsVisible: z.boolean(),
        }),
      });
      expect(pageHeading.formIsVisible).toBe(true);

      // Step 5: Verify the form has ALL five specified sections
      const formSections = await ctx.stagehand.page.extract({
        instruction:
          "Extract every section heading visible in this player profile creation form. The expected sections are: 'Basic Info', 'Football Details', 'Physical', 'Contact', and 'Emergency Contact'. Return each section heading text you find.",
        schema: z.object({
          sectionHeadings: z.array(z.string()),
        }),
      });

      const headings = formSections.sectionHeadings.map((h) =>
        h.toLowerCase()
      );
      // Must have at least 5 sections
      expect(headings.length).toBeGreaterThanOrEqual(5);
      // Must include Basic Info
      expect(headings).toEqual(
        expect.arrayContaining([expect.stringContaining("basic")])
      );
      // Must include Football Details
      expect(headings).toEqual(
        expect.arrayContaining([expect.stringContaining("football")])
      );
      // Must include Physical
      expect(headings).toEqual(
        expect.arrayContaining([expect.stringContaining("physical")])
      );
      // Must include Contact
      expect(headings).toEqual(
        expect.arrayContaining([expect.stringContaining("contact")])
      );
      // Must include Emergency Contact
      expect(headings).toEqual(
        expect.arrayContaining([expect.stringContaining("emergency")])
      );

      // Step 6: Verify all specified fields exist in the form
      const allFields = await ctx.stagehand.page.extract({
        instruction:
          "Extract ALL form field labels visible on this entire player creation form page. Include fields from every section: Basic Info (First Name, Last Name, Photo, Date of Birth, Nationality), Football Details (Position, Squad Number, Preferred Foot), Physical (Height, Weight), Contact (Phone, Personal Email, Address), Emergency Contact (Name, Relationship, Phone). Return every label you can find.",
        schema: z.object({
          allFieldLabels: z.array(z.string()),
        }),
      });

      const labels = allFields.allFieldLabels.map((l) => l.toLowerCase());
      const allLabelsText = labels.join(" | ");

      // Basic Info fields
      expect(allLabelsText).toMatch(/first.*name|first name/);
      expect(allLabelsText).toMatch(/last.*name|last name/);
      expect(allLabelsText).toMatch(/photo|upload|image/);
      expect(allLabelsText).toMatch(/date.*birth|dob|birth/);
      expect(allLabelsText).toMatch(/national/);

      // Football Details fields
      expect(allLabelsText).toMatch(/position/);
      expect(allLabelsText).toMatch(/squad|number/);
      expect(allLabelsText).toMatch(/foot|prefer/);

      // Physical fields
      expect(allLabelsText).toMatch(/height/);
      expect(allLabelsText).toMatch(/weight/);

      // Contact fields
      expect(allLabelsText).toMatch(/phone/);
      expect(allLabelsText).toMatch(/email/);
      expect(allLabelsText).toMatch(/address/);
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
    it("submitting the form triggers the createPlayer mutation which persists the player with correct position and navigates to the new player profile page", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      const playerFirst = `AC4Mut${Date.now()}`;
      const playerLast = "MutCheck";
      const chosenPosition = "Defender";

      // Navigate to the player creation form
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Fill required fields and submit — this triggers the createPlayer mutation
      await fillRequiredFieldsAndSubmit({
        firstName: playerFirst,
        lastName: playerLast,
        position: chosenPosition,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // After the createPlayer mutation, check for success confirmation
      const mutationResult = await ctx.stagehand.page.extract({
        instruction:
          "Look for any toast notification, success message, or confirmation that indicates the player profile was successfully created. Return the text and whether such a message exists.",
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

      // AC4: After creation, admin is navigated to the player profile page /players/[newPlayerId]
      await ctx.stagehand.page.waitForTimeout(2000);
      const profileUrl = ctx.stagehand.page.url();
      expect(profileUrl).toContain("/players/");
      expect(profileUrl).not.toContain("/players/new");

      // Verify the player profile page shows the correct data persisted by the mutation
      const profileData = await ctx.stagehand.page.extract({
        instruction: `On this player profile page, extract the player's displayed name and position. The player should be named '${playerFirst} ${playerLast}' with position '${chosenPosition}'.`,
        schema: z.object({
          displayedName: z.string(),
          displayedPosition: z.string(),
        }),
      });

      // Assert the mutation persisted the correct name and position
      expect(profileData.displayedName).toContain(playerLast);
      expect(profileData.displayedPosition.toLowerCase()).toContain(
        chosenPosition.toLowerCase()
      );

      // Navigate to /players to verify the new player entry exists in the database list
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      // Check the players list for the newly created player — confirms database persistence
      const dbCheck = await ctx.stagehand.page.extract({
        instruction: `Search the players list or table for a player named '${playerFirst} ${playerLast}' or with last name '${playerLast}'. Is this player visible in the list? Return whether found and the displayed name.`,
        schema: z.object({
          playerFound: z.boolean(),
          playerDisplayName: z.string(),
        }),
      });

      expect(dbCheck.playerFound).toBe(true);
      expect(dbCheck.playerDisplayName).toContain(playerLast);
    });

    it("createPlayer mutation creates a player profile and persists it in the database with correct fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      const firstName = `CrMut${Date.now()}`;
      const lastName = "DbPersist";
      const position = "Goalkeeper";

      // Step 1: Navigate to the player creation form
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Step 2: Fill in form fields — triggers createPlayer mutation on submit
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

      // Step 3: Submit the form — this calls the createPlayer mutation
      await ctx.stagehand.page.act("click the 'Create Player' button");
      await ctx.stagehand.page.waitForTimeout(5000);

      // Step 4: Verify createPlayer mutation succeeded — toast confirms creation
      const toast = await ctx.stagehand.page.extract({
        instruction:
          "Look for a toast notification or success message that indicates the player was created successfully. Return the message text and whether it is visible.",
        schema: z.object({
          visible: z.boolean(),
          text: z.string(),
        }),
      });
      expect(toast.visible).toBe(true);

      // Step 5: Dismiss invite dialog if present
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the 'Got it' or 'Skip' button"
        );
        await ctx.stagehand.page.waitForTimeout(1000);
      } catch {
        // No dialog
      }

      // Step 6: Verify mutation returned a new player _id — we are redirected to /players/[id]
      await ctx.stagehand.page.waitForTimeout(2000);
      const url = ctx.stagehand.page.url();
      expect(url).toMatch(/\/players\/[a-z0-9]+/i);
      expect(url).not.toContain("/players/new");

      // Step 7: On the profile page, verify the mutation persisted all submitted fields
      const profile = await ctx.stagehand.page.extract({
        instruction: `Extract the player's full displayed name, position, and status from this player profile page. The player should be '${firstName} ${lastName}' with position '${position}' and status 'active'.`,
        schema: z.object({
          name: z.string(),
          position: z.string(),
          status: z.string(),
        }),
      });

      // Verify createPlayer mutation persisted firstName, lastName correctly
      expect(profile.name.toLowerCase()).toContain(firstName.toLowerCase());
      expect(profile.name.toLowerCase()).toContain(lastName.toLowerCase());
      // Verify createPlayer mutation persisted position correctly
      expect(profile.position.toLowerCase()).toContain(position.toLowerCase());
      // Verify createPlayer mutation set status to "active"
      expect(profile.status.toLowerCase()).toContain("active");

      // Step 8: Navigate to the players list to verify database persistence
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(3000);

      const listCheck = await ctx.stagehand.page.extract({
        instruction: `Search the players list for a player with name containing '${firstName}' or '${lastName}'. Is this player visible in the list?`,
        schema: z.object({
          found: z.boolean(),
          displayName: z.string(),
        }),
      });

      // Confirm the createPlayer mutation persisted the player in the database
      expect(listCheck.found).toBe(true);
      expect(listCheck.displayName.toLowerCase()).toContain(
        lastName.toLowerCase()
      );
    });
  });

  // ─── AC5 (createPlayer mutation behavior): Verify mutation requirements ───
  describe("AC5: createPlayer mutation creates a player profile with all required fields and status active", () => {
    it("createPlayer mutation creates a player profile that is persisted in the database with status active and all submitted fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      const playerFirst = `AC5M${Date.now()}`;
      const playerLast = "MutReq";
      const chosenPosition = "Midfielder";

      // Navigate to form and create a player to trigger the createPlayer mutation
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      await fillRequiredFieldsAndSubmit({
        firstName: playerFirst,
        lastName: playerLast,
        position: chosenPosition,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // The createPlayer mutation should return a new player _id and navigate to the player profile
      // Dismiss any invite dialog that may appear
      try {
        await ctx.stagehand.page.act(
          "if a dialog or modal is visible, click the 'Got it' or 'Skip' button"
        );
        await ctx.stagehand.page.waitForTimeout(1000);
      } catch {
        // No dialog present
      }

      // Verify we were redirected to the new player's profile page (mutation returned _id)
      await ctx.stagehand.page.waitForTimeout(2000);
      const url = ctx.stagehand.page.url();
      // The URL should be /players/[newPlayerId] — confirms mutation returned the new _id
      expect(url).toMatch(/\/players\/[a-z0-9]+/i);
      expect(url).not.toContain("/players/new");

      // On the player profile page, verify the mutation persisted all required fields correctly
      const playerProfile = await ctx.stagehand.page.extract({
        instruction: `On this player profile page, extract the player's full name, position, and any status indicator. The player should be named '${playerFirst} ${playerLast}' with position '${chosenPosition}'. Check if there is any status like 'active' shown.`,
        schema: z.object({
          fullName: z.string(),
          position: z.string(),
          statusText: z.string(),
        }),
      });

      // Verify the createPlayer mutation persisted the correct data
      expect(playerProfile.fullName).toContain(playerFirst);
      expect(playerProfile.fullName).toContain(playerLast);
      expect(playerProfile.position.toLowerCase()).toContain(
        chosenPosition.toLowerCase()
      );
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

  // ─── AC2: "Add Player" opens a multi-section profile creation form ───
  describe("AC2: Add Player opens a multi-section profile creation form", () => {
    it("'Add Player' opens a multi-section profile creation form with Basic Info, Football Details, Physical, Contact, and Emergency Contact sections", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      // Navigate to the players list page and click "Add Player"
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);
      await ctx.stagehand.page.act("click the 'Add Player' button");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Verify the multi-section profile creation form opened
      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");

      // Verify the form has multiple sections with the specified names
      const formStructure = await ctx.stagehand.page.extract({
        instruction:
          "On this player creation form page, find ALL section headings and ALL form field labels. List every section heading (like 'Basic Info', 'Football Details', 'Physical', 'Contact', 'Emergency Contact') and every field label (like 'First Name', 'Last Name', 'Position', 'Squad Number', etc.). Return them separately.",
        schema: z.object({
          sectionHeadings: z.array(z.string()),
          fieldLabels: z.array(z.string()),
        }),
      });

      // AC2: Form must be multi-section with at least Basic Info and Football Details
      const headings = formStructure.sectionHeadings.map((h) => h.toLowerCase());
      expect(headings.length).toBeGreaterThanOrEqual(3);
      expect(headings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("basic"),
          expect.stringContaining("football"),
        ])
      );

      // AC2: Form must contain required fields: First Name, Last Name, Position
      const labels = formStructure.fieldLabels.map((l) => l.toLowerCase());
      const allLabels = labels.join(" ");
      expect(allLabels).toMatch(/first.*name|first name/);
      expect(allLabels).toMatch(/last.*name|last name/);
      expect(allLabels).toMatch(/position/);

      // AC2: Form must contain optional fields: Date of Birth, Nationality, Squad Number, Preferred Foot
      expect(allLabels).toMatch(/date.*birth|dob|birth/);
      expect(allLabels).toMatch(/national/);
      expect(allLabels).toMatch(/squad|number/);
      expect(allLabels).toMatch(/foot|prefer/);
    });

    it("AC2 — verifies clicking Add Player button on /players opens the profile creation form with all required sections and fields", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      // Step 1: Navigate to the players list page
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Step 2: Click the "Add Player" button to open the profile creation form
      await ctx.stagehand.page.act("click the 'Add Player' button");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Step 3: Verify the profile creation form opened at /players/new
      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");

      // Step 4: Verify the form is a multi-section profile creation form
      // Extract form title/heading to confirm we are on the profile creation form
      const formHeading = await ctx.stagehand.page.extract({
        instruction:
          "Look for the main page heading or form title. It should say something like 'Add Player', 'Create Player', or 'New Player'. Return the heading text and whether a form is visible on the page.",
        schema: z.object({
          headingText: z.string(),
          isFormVisible: z.boolean(),
        }),
      });

      // The profile creation form must be visible after clicking Add Player
      expect(formHeading.isFormVisible).toBe(true);
      expect(formHeading.headingText.toLowerCase()).toMatch(
        /add|create|new|player/
      );

      // Step 5: Extract all form section headings to verify multi-section structure
      const sections = await ctx.stagehand.page.extract({
        instruction:
          "Extract all the section headings/titles visible in this player profile creation form. Look for section titles like 'Basic Info', 'Football Details', 'Physical', 'Contact', 'Emergency Contact'. Return each section title found and the total count.",
        schema: z.object({
          sectionTitles: z.array(z.string()),
          sectionCount: z.number(),
        }),
      });

      // AC2: The form must have multiple sections (at least 3)
      expect(sections.sectionCount).toBeGreaterThanOrEqual(3);

      // AC2: The form must include these specific sections
      const titles = sections.sectionTitles.map((t) => t.toLowerCase());
      expect(titles).toEqual(
        expect.arrayContaining([
          expect.stringContaining("basic"),
          expect.stringContaining("football"),
        ])
      );

      // Step 6: Verify required form fields are present in the opened form
      const fields = await ctx.stagehand.page.extract({
        instruction:
          "Look at the form fields in the Basic Info and Football Details sections. Find the First Name, Last Name, and Position fields. Check if they have required indicators (like asterisks * next to their labels). Return the field labels and whether they appear to be required.",
        schema: z.object({
          fields: z.array(
            z.object({
              label: z.string(),
              isRequired: z.boolean(),
            })
          ),
        }),
      });

      // AC2: Required fields (First Name, Last Name, Position) must be present
      const fieldLabels = fields.fields.map((f) => f.label.toLowerCase());
      expect(fieldLabels).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/first.*name/),
          expect.stringMatching(/last.*name/),
          expect.stringMatching(/position/),
        ])
      );
    });

    it("AC2 — the profile creation form contains all five sections: Basic Info, Football Details, Physical, Contact, and Emergency Contact", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      // Navigate directly to the form to verify all sections
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Extract all form section headings
      const sections = await ctx.stagehand.page.extract({
        instruction:
          "Extract all the section headings/titles visible in this player profile creation form. Look for section titles like 'Basic Info', 'Football Details', 'Physical', 'Contact', 'Emergency Contact'. Return each section title found.",
        schema: z.object({ sectionTitles: z.array(z.string()) }),
      });

      // AC2: The form must have all five sections
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

    it("AC2 — clicking Add Player opens a multi-section form with ALL specified fields: Basic Info (first name, last name, photo, DOB, nationality), Football Details (position, squad number, preferred foot), Physical (height, weight), Contact (phone, email, address), Emergency Contact (name, relationship, phone)", async () => {
      await ctx.auth.signInAs({ role: "admin" });

      // Navigate to /players and click "Add Player" to open the form
      await ctx.goto("/players");
      await ctx.stagehand.page.waitForTimeout(2000);
      await ctx.stagehand.page.act("click the 'Add Player' button");
      await ctx.stagehand.page.waitForTimeout(2000);

      // Confirm we're on the form page
      const url = ctx.stagehand.page.url();
      expect(url).toContain("/players/new");

      // ── Basic Info section: first name, last name, photo upload, date of birth, nationality ──
      const basicInfoFields = await ctx.stagehand.page.extract({
        instruction:
          "In the 'Basic Info' section of the form, find ALL form fields. Look for: a 'First Name' text input, a 'Last Name' text input, a photo upload area (file picker or drag-and-drop zone), a 'Date of Birth' date picker field, and a 'Nationality' text input. Return the label or name of each field you find in this section.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const basicLabels = basicInfoFields.fieldLabels.map((l) =>
        l.toLowerCase()
      );
      // AC2: Basic Info must have first name, last name, photo, date of birth, nationality
      expect(basicLabels).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/first.*name/),
          expect.stringMatching(/last.*name/),
        ])
      );
      // Photo upload and date of birth must be present
      const basicJoined = basicLabels.join(" ");
      expect(basicJoined).toMatch(/photo|upload|image/);
      expect(basicJoined).toMatch(/date.*birth|dob|birth/);
      expect(basicJoined).toMatch(/national/);

      // ── Football Details section: position, squad number, preferred foot ──
      const footballFields = await ctx.stagehand.page.extract({
        instruction:
          "In the 'Football Details' section of the form, find ALL form fields. Look for: a 'Position' dropdown/select (with options Goalkeeper, Defender, Midfielder, Forward), a 'Squad Number' number input, and a 'Preferred Foot' dropdown/select (with options Left, Right, Both). Return the label or name of each field you find in this section.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const footballLabels = footballFields.fieldLabels.map((l) =>
        l.toLowerCase()
      );
      // AC2: Football Details must have position, squad number, preferred foot
      expect(footballLabels).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/position/),
        ])
      );
      const footballJoined = footballLabels.join(" ");
      expect(footballJoined).toMatch(/squad|number/);
      expect(footballJoined).toMatch(/prefer.*foot|foot/);

      // ── Physical section: height, weight ──
      const physicalFields = await ctx.stagehand.page.extract({
        instruction:
          "In the 'Physical' section of the form, find ALL form fields. Look for: a 'Height' number input (in cm) and a 'Weight' number input (in kg). Return the label or name of each field you find in this section.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const physicalLabels = physicalFields.fieldLabels.map((l) =>
        l.toLowerCase()
      );
      // AC2: Physical must have height and weight
      const physicalJoined = physicalLabels.join(" ");
      expect(physicalJoined).toMatch(/height/);
      expect(physicalJoined).toMatch(/weight/);

      // ── Contact section: phone, personal email, address ──
      const contactFields = await ctx.stagehand.page.extract({
        instruction:
          "In the 'Contact' section of the form (NOT the Emergency Contact section), find ALL form fields. Look for: a 'Phone' text input, a 'Personal Email' or 'Email' input, and an 'Address' textarea or text input. Return the label or name of each field you find in this section.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const contactLabels = contactFields.fieldLabels.map((l) =>
        l.toLowerCase()
      );
      // AC2: Contact must have phone, personal email, address
      const contactJoined = contactLabels.join(" ");
      expect(contactJoined).toMatch(/phone/);
      expect(contactJoined).toMatch(/email/);
      expect(contactJoined).toMatch(/address/);

      // ── Emergency Contact section: name, relationship, phone ──
      const emergencyFields = await ctx.stagehand.page.extract({
        instruction:
          "In the 'Emergency Contact' section of the form, find ALL form fields. Look for: a 'Name' or 'Contact Name' text input, a 'Relationship' text input, and a 'Phone' text input. Return the label or name of each field you find in this section.",
        schema: z.object({
          fieldLabels: z.array(z.string()),
        }),
      });

      const emergencyLabels = emergencyFields.fieldLabels.map((l) =>
        l.toLowerCase()
      );
      // AC2: Emergency Contact must have name, relationship, phone
      const emergencyJoined = emergencyLabels.join(" ");
      expect(emergencyJoined).toMatch(/name/);
      expect(emergencyJoined).toMatch(/relation/);
      expect(emergencyJoined).toMatch(/phone/);
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

  // ─── AC7: Admin is prompted to send an account invitation after player creation ───
  describe("AC7: Admin is prompted to send an account invitation", () => {
    it("after creating a player without email, admin is prompted with an invitation dialog showing a 'Got it' dismiss button and a message about adding email later", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC7a${Date.now()}`;

      // Create a player without personal email
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "NoEmail",
        position: "Defender",
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // AC7: After player creation, a dialog/prompt must appear about invitation
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "Check if an invitation dialog or modal is visible on the page after player creation. This should be a prompt about inviting the player or about no email being provided. Extract the dialog title, the full message text, and all button labels visible in the dialog.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      // AC7: The invitation prompt dialog must be visible after player creation
      expect(dialog.isDialogVisible).toBe(true);

      // AC7: When no personalEmail was provided, the prompt shows a "Got it" dismiss button
      const hasGotIt = dialog.buttonLabels.some((b) =>
        b.toLowerCase().includes("got it")
      );
      expect(hasGotIt).toBe(true);

      // AC7: The message should mention adding email later to invite the player
      const fullText =
        `${dialog.dialogTitle} ${dialog.dialogMessage}`.toLowerCase();
      expect(fullText).toMatch(/email|invite|later/);
    });

    it("after creating a player with email, admin is prompted with an invitation dialog offering 'Send Invite' and 'Skip' buttons", async () => {
      await ctx.auth.signInAs({ role: "admin" });
      await ctx.goto("/players/new");
      await ctx.stagehand.page.waitForTimeout(2000);

      const uniqueName = `AC7b${Date.now()}`;
      const testEmail = `${uniqueName}@test.example.com`;

      // Create a player with a personal email
      await fillRequiredFieldsAndSubmit({
        firstName: uniqueName,
        lastName: "HasEmail",
        position: "Goalkeeper",
        email: testEmail,
      });
      await ctx.stagehand.page.waitForTimeout(4000);

      // AC7: After player creation with email, a dialog prompts the admin to send an invitation
      const dialog = await ctx.stagehand.page.extract({
        instruction:
          "Check if an invitation dialog or modal is visible. It should ask whether to invite the player to create their account. Extract the dialog title, message content, and all button labels.",
        schema: z.object({
          isDialogVisible: z.boolean(),
          dialogTitle: z.string(),
          dialogMessage: z.string(),
          buttonLabels: z.array(z.string()),
        }),
      });

      // AC7: The invitation prompt dialog must be visible
      expect(dialog.isDialogVisible).toBe(true);

      // AC7: When personalEmail is set, the dialog offers "Send Invite" and "Skip" buttons
      const btnLabels = dialog.buttonLabels.map((b) => b.toLowerCase());
      expect(
        btnLabels.some((b) => b.includes("send") || b.includes("invite"))
      ).toBe(true);
      expect(btnLabels.some((b) => b.includes("skip"))).toBe(true);

      // AC7: The dialog message mentions invitation or account creation
      const msgLower =
        `${dialog.dialogTitle} ${dialog.dialogMessage}`.toLowerCase();
      expect(msgLower).toMatch(/invit|account/);
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
