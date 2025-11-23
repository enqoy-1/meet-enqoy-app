import { z } from "zod";

// Authentication validation schemas
export const authSchemas = {
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters"),
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
};

// Assessment form validation schemas  
export const assessmentSchemas = {
  city: z.string().min(1, "Please select a city"),
  preferredTime: z.enum(["dinner", "lunch"], { required_error: "Please select your preferred time" }),
  dinnerVibe: z.string().min(1, "Please select an option"),
  talkTopic: z.string().min(1, "Please select a topic"),
  groupDynamic: z.string().min(1, "Please select a group dynamic"),
  humorType: z.string().min(1, "Please select your humor type"),
  wardrobeStyle: z.string().min(1, "Please select a style"),
  introvertScale: z.number().min(1).max(5),
  aloneTimeScale: z.number().min(1).max(5),
  familyScale: z.number().min(1).max(5),
  spiritualityScale: z.number().min(1).max(5),
  humorScale: z.number().min(1).max(5),
  meetingPriority: z.string().min(1, "Please select what's important"),
  dietaryPreferences: z.string().min(1, "Please select dietary preferences"),
  customDietary: z.string().max(200).optional(),
  restaurantFrequency: z.string().min(1, "Please select frequency"),
  spending: z.string().min(1, "Please select spending range"),
  gender: z.string().min(1, "Please select gender"),
  relationshipStatus: z.string().min(1, "Please select relationship status"),
  hasChildren: z.string().min(1, "Please select an option"),
  country: z.string().min(1, "Please select your country"),
  birthday: z.date().refine((date) => {
    const age = new Date().getFullYear() - date.getFullYear();
    return age >= 18;
  }, "You must be at least 18 years old"),
  nickName: z.string().trim().min(1, "Name is required").max(100),
  neverGuess: z.string().trim().min(1, "Please share something").max(500),
  funFact: z.string().trim().min(1, "Please share a fun fact").max(500),
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
