import * as yup from "yup";

export const createUserSchema = yup.object({
  f_name: yup.string().required("First name is required").trim(),
  l_name: yup.string().required("Last name is required").trim(),
  email: yup.string().required("Email is required").email("Invalid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/,
      "Password must contain one capital letter and one special character"
    ),
});

export type CreateUserFormData = yup.InferType<typeof createUserSchema>;
