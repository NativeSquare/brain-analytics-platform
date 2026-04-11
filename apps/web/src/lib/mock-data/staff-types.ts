export interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  role: string;
  photoUrl: string | null;
  email: string;
  phone: string;
  bio?: string;
  dateJoined?: number;
  status?: string;
}
