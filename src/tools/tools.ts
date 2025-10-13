import { z } from 'zod/v4';
import { StructuredTool, tool } from '@langchain/core/tools';
import { TavilyCrawl, TavilySearch } from '@langchain/tavily';

// Define tools
const add: StructuredTool = tool(({ a, b }) => a + b, {
  name: 'add',
  description: 'Add two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const subtract: StructuredTool = tool(({ a, b }) => a - b, {
  name: 'subtract',
  description: 'Subtract two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const multiply: StructuredTool = tool(({ a, b }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const divide: StructuredTool = tool(({ a, b }) => a / b, {
  name: 'divide',
  description: 'Divide two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const tavilySearchTool: StructuredTool = new TavilySearch({
  maxResults: 3,
  // topic: 'general',
  // includeAnswer: false,
  // includeRawContent: false,
  // includeImages: false,
  // includeImageDescriptions: false,
  // searchDepth: "basic",
  // timeRange: "day",
  // includeDomains: [],
  // excludeDomains: [],
}) as unknown as StructuredTool;

const tavilyCrawlTool: StructuredTool = new TavilyCrawl({
  maxDepth: 2,
  maxBreadth: 5,
  // extractDepth: "basic",
  // format: "markdown",
  limit: 10,
  // includeImages: false,
  // allowExternal: false,
}) as unknown as StructuredTool;

// https://docs.langchain.com/oss/javascript/integrations/tools/index#tools-and-toolkits
export const tools: StructuredTool[] = [
  add,
  subtract,
  multiply,
  divide,
  tavilySearchTool,
  tavilyCrawlTool,
];

export const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
