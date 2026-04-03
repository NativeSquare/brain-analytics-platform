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
  breadcrumbs: {
    home: string;
    calendar: string;
    documents: string;
    players: string;
    dashboards: string;
    settings: string;
    team: string;
    dashboard: string;
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
  breadcrumbs: {
    home: "Home",
    calendar: "Calendar",
    documents: "Documents",
    players: "Players",
    dashboards: "Dashboards",
    settings: "Settings",
    team: "Team",
    dashboard: "Dashboard",
    playerProfile: "Player Profile",
    memberDetails: "Member Details",
    addPlayer: "Add Player",
  },
};
