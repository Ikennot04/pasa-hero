import * as yup from "yup";

export const editDriverSchema = yup.object({
  f_name: yup.string().required("First name is required").trim(),
  l_name: yup.string().required("Last name is required").trim(),
  license_number: yup.string().required("License number is required").trim(),
  contact_number: yup
    .string()
    .trim()
    .test(
      "positiveContactNumber",
      "Contact number must be greater than zero",
      (value) => {
        if (!value) return true;
        const normalized = value.trim();
        if (!normalized) return true;
        if (normalized.includes("-")) return false;
        const digitsOnly = normalized.replace(/\D/g, "");
        if (!digitsOnly) return true;
        return BigInt(digitsOnly) > 0n;
      },
    ),
  status: yup
    .string()
    .oneOf(["active", "inactive"], "Status must be active or inactive")
    .required("Status is required"),
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

export type EditDriverFormData = yup.InferType<typeof editDriverSchema>;
