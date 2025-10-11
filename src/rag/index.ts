import { z } from 'zod/v4';

const Resource = z.object({
  uri: z.string().describe('The URI of the resource.'),
  title: z.string().describe('The title of the resource.'),
  description: z
    .string()
    .optional()
    .describe('The description of the resource.'),
});
