import * as yup from "yup";

export const addDriverSchema = yup.object({
  f_name: yup.string().required("First name is required").trim(),
  l_name: yup.string().required("Last name is required").trim(),
  license_number: yup.string().required("License number is required").trim(),
  contact_number: yup.string().trim(),
  profile_image: yup
    .mixed<FileList>()
    .test("fileType", "Must be an image (JPEG, PNG, GIF, WebP)", (value) => {
      if (!value?.length) return true;
      const file = value[0];
      return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file?.type ?? ""
      );
    })
    .test("fileSize", "Image must be 5MB or less", (value) => {
      if (!value?.length) return true;
      const file = value[0];
      return (file?.size ?? 0) <= 5 * 1024 * 1024;
    }),
});

export type AddDriverFormData = yup.InferType<typeof addDriverSchema>;
