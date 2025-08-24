import {z} from "zod";

export const CreateUser = z.object({
    email: z.email()
})

export const SignIn = z.object({
    email: z.email(),
    otp: z.string().or(z.number().int()),
})