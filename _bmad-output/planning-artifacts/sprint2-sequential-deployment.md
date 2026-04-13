# Plan de Deploiement Sequentiel — Sprint 2

## Context

Le Sprint 2 comporte 4 epiques. Le client les recoit sequentiellement. Pour chaque phase, on commente chirurgicalement les points d'entree des epiques non encore livrees — aucun code n'est supprime.

**Ordre de livraison :**
1. Epic 12 — Sprint 1 Polish (deja actif, rien a faire)
2. Epic 13 — Staff Profiles (a activer quand le client valide Epic 12)
3. Epic 14 — Injury Reporting (a activer quand le client valide Epic 13)
4. Epic 15 — Live Data Integration (pas encore developpe)

---

## Phase 1 : Livraison Epic 12 seul (desactiver Epic 13 + 14)

### A. Desactiver Epic 13 (Staff Profiles)

| # | Fichier | Action |
|---|---------|--------|
| S1 | `apps/web/src/components/app-sidebar.tsx` | Commenter le nav item `{ title: t.nav.staff, url: "/staff", icon: IconBriefcase }` |
| S2 | `apps/web/src/components/app-sidebar.tsx` | Commenter le bloc conditionnel "My Profile" (`...(ownStaffProfile ? [...] : [])`) |
| S3 | `apps/web/src/components/app-sidebar.tsx` | Commenter l'import et l'appel de `useOwnStaffProfile` |

> **Note :** Les pages `/staff/*` restent dans le code mais sont inaccessibles sans le lien sidebar.

### B. Desactiver Epic 14 (Injury Reporting)

| # | Fichier | Action |
|---|---------|--------|
| I1 | `apps/web/src/components/app-sidebar.tsx` | Commenter le nav item "Injury Reports" |
| I2 | `apps/web/src/components/players/PlayerProfileTabs.tsx` | Commenter le `TabsTrigger value="injuries"` |
| I3 | `apps/web/src/components/players/PlayerProfileTabs.tsx` | Commenter le `TabsContent value="injuries"` |
| I4 | `apps/web/src/components/players/PlayerCardGrid.tsx` | Commenter l'appel `useQuery(api.players.queries.getPlayersRtpStatuses, ...)` et remplacer par `const rtpStatuses = undefined;` |
| I5 | `apps/web/src/app/(app)/players/page.tsx` | Dans `SquadSummary`, commenter l'appel `useQuery(api.players.queries.getPlayersRtpStatuses, ...)` et remplacer par `const rtpStatuses = undefined;` |
| I6 | `apps/web/src/components/players/PlayerProfileHeader.tsx` | Commenter les queries `getPlayerInjuryStatus` et `canViewInjuryDetails` |
| I7 | `apps/web/src/components/players/PlayerProfileHeader.tsx` | Commenter le rendu conditionnel du dot d'injury |
| I8 | `apps/web/src/lib/dashboard-registry.ts` | Commenter la ligne `"medical-overview": () => import(...)` |

> **Note :** Les pages `/injuries/reports` et `/dashboards/medical-overview` restent dans le code mais sont inaccessibles.

---

## Phase 2 : Activer Epic 13 (Staff Profiles)

**Decommenter les points S1, S2, S3** dans `app-sidebar.tsx` :
- S1 : Nav item "Staff"
- S2 : Bloc "My Profile"
- S3 : Import + appel `useOwnStaffProfile`

---

## Phase 3 : Activer Epic 14 (Injury Reporting)

**Decommenter les points I1 a I8** :
- I1 : Nav item "Injury Reports" dans sidebar
- I2 + I3 : Tab "Injuries" dans PlayerProfileTabs
- I4 + I5 : Queries `getPlayersRtpStatuses` (retirer le `= undefined` temporaire)
- I6 + I7 : Injury status dot dans PlayerProfileHeader
- I8 : Entree `medical-overview` dans dashboard-registry

---

## Verification apres chaque phase

| Phase | Test |
|-------|------|
| Phase 1 | Sidebar ne montre ni "Staff" ni "Injury Reports". Page Players n'a pas d'onglet Injuries. Cards Players groupees par "Available" uniquement. |
| Phase 2 | "Staff" visible dans sidebar. `/staff` affiche le directory. Creation/edition/invitation fonctionnent. |
| Phase 3 | "Injury Reports" visible (admin). Onglet Injuries dans profil player. Cards Players groupees par medical status. Medical Overview dashboard accessible. |
