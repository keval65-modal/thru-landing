'use server';

/**
 * @fileOverview Predicts customer arrival time, checks proximity, and generates alerts for vendors.
 *
 * - predictArrivalTime - Predicts arrival time and generates proximity alerts.
 * - PredictArrivalTimeInput - The input type for the flow.
 * - PredictArrivalTimeOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictArrivalTimeInputSchema = z.object({
  vendorAddress: z
    .string()
    .describe('The address of the vendor, including street, city, and state.'),
  customerAddress: z
    .string()
    .describe(
      'The current address of the customer, including street, city, and state.'
    ),
  orderId: z.string().describe('The unique ID of the order being tracked.'),
});
export type PredictArrivalTimeInput = z.infer<typeof PredictArrivalTimeInputSchema>;

const PredictArrivalTimeOutputSchema = z.object({
  predictedArrivalTime: z
    .string()
    .describe(
      'The predicted arrival time of the customer at the vendor location. Should be in ISO 8601 format.'
    ),
  travelTimeEstimateMinutes: z
    .number()
    .describe('Estimated travel time in minutes from customer to vendor.'),
  isWithinkmThreshold: z
    .boolean()
    .describe('Whether the customer is within a 1km radius of the vendor.'),
  proximityStatus: z
    .enum(['Far', 'Approaching', 'Arrived'])
    .describe(
      'The proximity status of the customer relative to the vendor.'
    ),
  notificationForVendor: z
    .string()
    .describe(
      'A concise notification message for the vendor (e.g., "Customer for order #XYZ is 5 mins away.").'
    ),
  notificationForCustomer: z
    .string()
    .describe(
      'A concise notification message for the customer (e.g., "You are approaching Your-Vendor-Name, get ready for pickup!").'
    ),
});
export type PredictArrivalTimeOutput = z.infer<typeof PredictArrivalTimeOutputSchema>;

export async function predictArrivalTime(
  input: PredictArrivalTimeInput
): Promise<PredictArrivalTimeOutput> {
  return predictArrivalTimeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictArrivalTimePrompt',
  input: {schema: PredictArrivalTimeInputSchema},
  output: {schema: PredictArrivalTimeOutputSchema},
  prompt: `You are an expert logistics AI for a curbside pickup service called "Thru". Your task is to analyze a customer's proximity to a vendor and generate relevant alerts.

You are provided with the vendor's address, the customer's current address, and the order ID.

Vendor Address: {{{vendorAddress}}}
Customer Address: {{{customerAddress}}}
Order ID: {{{orderId}}}

Based on this, you must:
1.  Calculate the estimated travel time in minutes, considering potential traffic.
2.  Predict the customer's arrival time in ISO 8601 format.
3.  Determine if the customer is within a 1km radius of the vendor. Set 'isWithinkmThreshold' to true if they are.
4.  Set the 'proximityStatus':
    - 'Arrived' if the distance is negligible (less than 100m or travel time < 1 min).
    - 'Approaching' if the travel time is less than 5 minutes or they are within the 1km threshold.
    - 'Far' otherwise.
5.  Generate a concise, friendly notification for the vendor. It should mention the order ID and the customer's ETA.
6.  Generate a concise, friendly notification for the customer. It should mention the vendor's name (which you can infer from the address if not provided) and that they are approaching.

Provide the full response in the required JSON format.
`,
});

const predictArrivalTimeFlow = ai.defineFlow(
  {
    name: 'predictArrivalTimeFlow',
    inputSchema: PredictArrivalTimeInputSchema,
    outputSchema: PredictArrivalTimeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
