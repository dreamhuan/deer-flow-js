import { z } from 'zod/v4';
import { tool } from '@langchain/core/tools';

// Define tools
const add = tool(({ a, b }) => a + b, {
  name: 'add',
  description: 'Add two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const subtract = tool(({ a, b }) => a - b, {
  name: 'subtract',
  description: 'Subtract two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: 'divide',
  description: 'Divide two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

export const tools = [add, subtract, multiply, divide];

export const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
