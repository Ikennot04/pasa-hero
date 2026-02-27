export type DriverStatus = "active" | "inactive";

export type DriverProps = {
  id: string;
  f_name: string;
  l_name: string;
  license_number: string;
  contact_number: string;
  profile_image?: string;
  status: DriverStatus;
};
