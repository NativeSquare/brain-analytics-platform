export interface Dictionary {
  common: {
    save: string;
    cancel: string;
    delete: string;
    create: string;
    edit: string;
    yes: string;
    no: string;
    loading: string;
    error: string;
    retry: string;
    search: string;
    noResults: string;
    back: string;
    close: string;
    submit: string;
    confirm: string;
    selectAll: string;
    clear: string;
  };
  nav: {
    home: string;
    dashboards: string;
    players: string;
    calendar: string;
    documents: string;
    staff: string;
    team: string;
    account: string;
    getHelp: string;
    logOut: string;
    settings: string;
  };
  account: {
    title: string;
    profile: string;
    profileDescription: string;
    fullName: string;
    avatar: string;
    avatarCurrent: string;
    avatarDrop: string;
    avatarHint: string;
    access: string;
    accessDescription: string;
    teamLabel: string;
    noTeam: string;
    role: string;
    noRole: string;
    admin: string;
    language: string;
    languageDescription: string;
    english: string;
    italian: string;
    saving: string;
    profileUpdated: string;
    profileUpdateError: string;
    nameRequired: string;
    selectImage: string;
    imageTooLarge: string;
    loginRequired: string;
    manageProfile: string;
  };
  dashboards: {
    title: string;
    searchPlaceholder: string;
    allCategories: string;
    noDashboards: string;
    noResults: string;
    pinned: string;
    recent: string;
    browseDashboards: string;
    noRecentDashboards: string;
    noPinnedDashboards: string;
  };
  players: {
    title: string;
    addPlayer: string;
    status: string;
    active: string;
    onLoan: string;
    leftClub: string;
    position: string;
    squadNumber: string;
  };
  staff: {
    title: string;
    addStaff: string;
    editStaff: string;
    newStaff: string;
    backToStaff: string;
    noStaff: string;
    addFirstStaff: string;
    tabs: {
      overview: string;
      certifications: string;
      roleInfo: string;
    };
    certComingSoon: string;
    roleInfoComingSoon: string;
    fields: {
      firstName: string;
      lastName: string;
      jobTitle: string;
      department: string;
      phone: string;
      email: string;
      bio: string;
      dateJoined: string;
      photo: string;
      status: string;
    };
    departments: {
      Coaching: string;
      Medical: string;
      Operations: string;
      Analytics: string;
      Management: string;
      Academy: string;
    };
    statuses: {
      active: string;
      inactive: string;
    };
    toast: {
      created: string;
      updated: string;
      deleted: string;
    };
    notFound: string;
    notFoundDescription: string;
    filterByDepartment: string;
    allDepartments: string;
    search: string;
  };
  calendar: {
    title: string;
    createEvent: string;
    noEvents: string;
  };
  documents: {
    title: string;
    upload: string;
    newFolder: string;
    noDocuments: string;
  };
  home: {
    recentResults: string;
    upcomingFixtures: string;
    recentDashboards: string;
    pinnedDashboards: string;
    quickAccess: string;
    noUpcomingMatch: string;
    matchInProgress: string;
    nextMatch: string;
    home: string;
    away: string;
    openDashboards: string;
    browseDashboards: string;
    homeVs: string;
    awayAt: string;
    postMatch: string;
    postMatchDesc: string;
    seasonOverview: string;
    seasonOverviewDesc: string;
    matchInHours: string;
    matchInDays: string;
    todayEvents: string;
    todayEventsDesc: string;
    noEventsToday: string;
    openCalendar: string;
    recentDocuments: string;
    noRecentDocuments: string;
    openDocuments: string;
    openContracts: string;
    noRecentDashboards: string;
  };
  search: {
    placeholder: string;
    typeToSearch: string;
    noResults: string;
    searching: string;
    dashboards: string;
    documents: string;
    players: string;
    calendarEvents: string;
    contracts: string;
  };
  injuryTimeline: {
    viewTable: string;
    viewTimeline: string;
    totalInjuries: string;
    totalDaysLost: string;
    currentlyActive: string;
    avgRecovery: string;
    injuredOn: string;
    expectedReturn: string;
    returnedOn: string;
    daysOut: string;
    ongoing: string;
    tbd: string;
    noInjuries: string;
    active: string;
  };
  rehabNotes: {
    title: string;
    addNote: string;
    saveNote: string;
    editNote: string;
    deleteNote: string;
    deleteConfirm: string;
    noNotes: string;
    notePlaceholder: string;
    noteAdded: string;
    noteUpdated: string;
    noteDeleted: string;
    noteRequired: string;
    noteTooLong: string;
  };
  breadcrumbs: {
    home: string;
    calendar: string;
    documents: string;
    players: string;
    dashboards: string;
    settings: string;
    team: string;
    dashboard: string;
    staff: string;
    staffProfile: string;
    addStaff: string;
    playerProfile: string;
    memberDetails: string;
    addPlayer: string;
  };
}

export const en: Dictionary = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    create: "Create",
    edit: "Edit",
    yes: "Yes",
    no: "No",
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    search: "Search...",
    noResults: "No results found",
    back: "Back",
    close: "Close",
    submit: "Submit",
    confirm: "Confirm",
    selectAll: "Select All",
    clear: "Clear",
  },
  nav: {
    home: "Home",
    dashboards: "Dashboards",
    players: "Players",
    calendar: "Calendar",
    documents: "Documents",
    staff: "Staff",
    team: "Team",
    account: "Account",
    getHelp: "Get Help",
    logOut: "Log Out",
    settings: "Settings",
  },
  account: {
    title: "Account",
    profile: "Profile",
    profileDescription: "Update your name and avatar.",
    fullName: "Full Name",
    avatar: "Avatar",
    avatarCurrent: "Current avatar",
    avatarDrop: "Click or drag an image to upload",
    avatarHint: "JPEG, PNG or WebP. Max 5MB.",
    access: "Access",
    accessDescription: "Your team and role information.",
    teamLabel: "Team",
    noTeam: "No team assigned",
    role: "Role",
    noRole: "No role",
    admin: "Admin",
    language: "Language",
    languageDescription: "Choose your preferred language",
    english: "English",
    italian: "Italian",
    saving: "Saving...",
    profileUpdated: "Profile updated successfully",
    profileUpdateError: "Failed to update profile. Please try again.",
    nameRequired: "Full name is required",
    selectImage: "Please select an image file",
    imageTooLarge: "Image must be less than 5MB",
    loginRequired: "Please log in to view your account.",
    manageProfile: "Manage your profile and view your access information.",
  },
  dashboards: {
    title: "Dashboards",
    searchPlaceholder: "Search dashboards...",
    allCategories: "All Categories",
    noDashboards: "No dashboards available",
    noResults: "No dashboards match your search",
    pinned: "Pinned",
    recent: "Recent",
    browseDashboards: "Browse dashboards",
    noRecentDashboards: "No recently viewed dashboards",
    noPinnedDashboards: "No pinned dashboards yet",
  },
  players: {
    title: "Players",
    addPlayer: "Add Player",
    status: "Status",
    active: "Active",
    onLoan: "On Loan",
    leftClub: "Left Club",
    position: "Position",
    squadNumber: "Squad Number",
  },
  staff: {
    title: "Staff Directory",
    addStaff: "Add Staff Member",
    editStaff: "Edit Staff Member",
    newStaff: "New Staff Member",
    backToStaff: "Back to Staff",
    noStaff: "No staff members yet",
    addFirstStaff: "Add your first staff member",
    tabs: {
      overview: "Overview",
      certifications: "Certifications",
      roleInfo: "Role Info",
    },
    certComingSoon: "Certifications will be available in a future update",
    roleInfoComingSoon: "Role information will be available in a future update",
    fields: {
      firstName: "First Name",
      lastName: "Last Name",
      jobTitle: "Job Title",
      department: "Department",
      phone: "Phone",
      email: "Email",
      bio: "Biography",
      dateJoined: "Date Joined",
      photo: "Photo",
      status: "Status",
    },
    departments: {
      Coaching: "Coaching",
      Medical: "Medical",
      Operations: "Operations",
      Analytics: "Analytics",
      Management: "Management",
      Academy: "Academy",
    },
    statuses: {
      active: "Active",
      inactive: "Inactive",
    },
    toast: {
      created: "Staff member created",
      updated: "Staff member updated",
      deleted: "Staff member deactivated",
    },
    notFound: "Staff member not found",
    notFoundDescription: "This staff member does not exist or you don't have access.",
    filterByDepartment: "Filter by department",
    allDepartments: "All Departments",
    search: "Search staff...",
  },
  calendar: {
    title: "Calendar",
    createEvent: "Create Event",
    noEvents: "No events",
  },
  documents: {
    title: "Documents",
    upload: "Upload",
    newFolder: "New Folder",
    noDocuments: "No documents",
  },
  home: {
    recentResults: "Recent Results",
    upcomingFixtures: "Upcoming Fixtures",
    recentDashboards: "Recent Dashboards",
    pinnedDashboards: "Pinned Dashboards",
    quickAccess: "Quick Access",
    noUpcomingMatch: "No upcoming match",
    matchInProgress: "Match in progress",
    nextMatch: "Next Match",
    home: "Home",
    away: "Away",
    openDashboards: "Open Dashboards",
    browseDashboards: "Browse all available dashboards",
    homeVs: "Home vs {opponent}",
    awayAt: "Away at {opponent}",
    postMatch: "Post Match",
    postMatchDesc: "Post-match analysis dashboard",
    seasonOverview: "Season Overview",
    seasonOverviewDesc: "Season overview dashboard",
    matchInHours: "In {count}h",
    matchInDays: "In {count} days",
    todayEvents: "Today",
    todayEventsDesc: "Today's schedule",
    noEventsToday: "No events planned for today",
    openCalendar: "Open Calendar",
    recentDocuments: "Documents",
    noRecentDocuments: "No document opened yet",
    openDocuments: "Open Documents",
    openContracts: "Open Contracts",
    noRecentDashboards: "No dashboard opened yet",
  },
  search: {
    placeholder: "Search...",
    typeToSearch: "Type at least 2 characters to search",
    noResults: "No results found.",
    searching: "Searching...",
    dashboards: "Dashboards",
    documents: "Documents",
    players: "Players",
    calendarEvents: "Calendar Events",
    contracts: "Contracts",
  },
  injuryTimeline: {
    viewTable: "Table",
    viewTimeline: "Timeline",
    totalInjuries: "Total Injuries",
    totalDaysLost: "Total Days Lost",
    currentlyActive: "Currently Active",
    avgRecovery: "Avg Recovery",
    injuredOn: "Injured",
    expectedReturn: "Expected return",
    returnedOn: "Returned",
    daysOut: "days",
    ongoing: "ongoing",
    tbd: "TBD",
    noInjuries: "No injury records to display.",
    active: "Active",
  },
  rehabNotes: {
    title: "Rehab Notes",
    addNote: "Add Note",
    saveNote: "Save Note",
    editNote: "Edit",
    deleteNote: "Delete",
    deleteConfirm: "Delete this rehab note? This action cannot be undone.",
    noNotes: "No rehab notes yet.",
    notePlaceholder: "Add a rehab note...",
    noteAdded: "Rehab note added",
    noteUpdated: "Rehab note updated",
    noteDeleted: "Rehab note deleted",
    noteRequired: "Note is required",
    noteTooLong: "Note cannot exceed 2000 characters",
  },
  breadcrumbs: {
    home: "Home",
    calendar: "Calendar",
    documents: "Documents",
    players: "Players",
    dashboards: "Dashboards",
    settings: "Settings",
    team: "Team",
    dashboard: "Dashboard",
    staff: "Staff",
    staffProfile: "Staff Profile",
    addStaff: "Add Staff",
    playerProfile: "Player Profile",
    memberDetails: "Member Details",
    addPlayer: "Add Player",
  },
};
