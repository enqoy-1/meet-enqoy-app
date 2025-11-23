import { z } from "zod";

// Authentication validation schemas
export const authSchemas = {
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters"),
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
};

// Assessment form validation schemas  
export const assessmentSchemas = {
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  countryCode: z.string().min(1, "Country code is required"),
  phone: z.string().regex(/^[0-9]{9,15}$/, "Invalid phone number format (9-15 digits)"),
  phoneVerify: z.string().regex(/^[0-9]{9,15}$/, "Invalid phone number format (9-15 digits)"),
  age: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 18 && num <= 100;
  }, "Age must be between 18 and 100"),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"], {
    required_error: "Please select a gender",
  }),
  socialStyle: z.string().min(1, "Please select your social style"),
  preferredTime: z.string().min(1, "Please select your preferred time"),
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
  dietaryPreferences: z.string().max(500, "Dietary preferences must be less than 500 characters").optional(),
};

// Admin forms validation schemas
export const adminSchemas = {
  eventTitle: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  eventDescription: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  eventPrice: z.coerce.number().min(0, "Price must be 0 or greater"),
  eventDateTime: z.string().refine((date) => new Date(date) > new Date(), {
    message: "Event date must be in the future",
  }),
  announcementTitle: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  announcementBody: z.string().trim().min(1, "Body is required").max(5000, "Body must be less than 5000 characters"),
  venueName: z.string().trim().min(1, "Venue name is required").max(200, "Venue name must be less than 200 characters"),
  venueAddress: z.string().trim().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  googleMapsLink: z.string().url("Invalid URL").startsWith("https://", "URL must use HTTPS").max(500, "URL must be less than 500 characters").optional().or(z.literal("")),
  venueNotes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  icebreakerQuestion: z.string().trim().min(1, "Question is required").max(500, "Question must be less than 500 characters"),
};

// Helper function to safely validate data with proper type narrowing
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  return result;
}
