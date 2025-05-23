// pages/api/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Client, MessageAPIResponseBase, TextMessage, FlexMessage } from '@line/bot-sdk';
import { google } from 'googleapis';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import * as stream from 'stream';
import { Readable } from 'stream';

// Cloudinary SDK
import { v2 as cloudinary } from 'cloudinary';

// **IMPORTANT: Replace with your actual credentials!**
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

// Initialize LINE Client
const lineClient = new Client({ channelAccessToken });

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials: googleServiceAccountKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Initialize Supabase
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Configure Cloudinary
cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
    secure: true,
});

// Helper function to push messages
const pushMessage = async (userId: string, messages: TextMessage[] | FlexMessage[]): Promise<MessageAPIResponseBase> => {
    try {
        return await lineClient.pushMessage(userId, messages);
    } catch (error: any) {
        console.error('Error pushing message:', error);
        throw error; // Re-throw to handle upstream
    }
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        try {
            const events = req.body.events;

            for (const event of events) {
                if (event.type === 'message') {
                    const message = event.message;
                    const userId = event.source.userId;
                    const groupId = event.source.groupId; //For Group Scope
                    console.log("GroupID", groupId)

                    if (!userId) {
                        console.error('User ID is missing in event:', event);
                        continue; // Skip to the next event
                    }

                    if (message.type === 'text') {
                        if (message.text.toLowerCase() === 'อับดุลเอ้ย') {
                            // Send Rich Menu with "เรียกเก็บเงิน" button
                            const flexMessage: FlexMessage = {
                                type: 'flex',
                                altText: 'เรียกเก็บเงิน',
                                contents: {
                                    type: 'bubble',
                                    body: {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ต้องการเรียกเก็บเงิน?',
                                                weight: 'bold',
                                                size: 'xl',
                                            },
                                        ],
                                    },
                                    footer: {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'button',
                                                style: 'primary',
                                                action: {
                                                    type: 'uri',
                                                    label: 'เรียกเก็บเงิน',
                                                    uri: 'https://your-domain.com/bill-form', // Replace with your actual URL
                                                },
                                            },
                                        ],
                                    },
                                },
                            };

                            await pushMessage(userId, [flexMessage]);
                        } else {
                            // Echo the message back to the user
                            await pushMessage(userId, [{ type: 'text', text: message.text }]);
                        }
                    } else if (message.type === 'image') {
                        // Handle image processing (bill analysis, category input, etc.)
                        const imageId = message.id;

                        // 1. Get the image content from LINE
                        const imageContent = await lineClient.getMessageContent(imageId);

                        // 2. Upload the image to Cloudinary
                        const arrayBuffer = await streamToArrayBuffer(imageContent);
                        const buffer = Buffer.from(arrayBuffer);

                        await new Promise((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream({
                                resource_type: 'image',
                                public_id: imageId, // Use imageId as public_id
                                upload_preset: cloudinaryUploadPreset,
                            }, (error, result) => {
                                if (error) {
                                    console.error('Cloudinary upload error:', error);
                                    reject(error);
                                    return;
                                }
                                console.log('Cloudinary upload result:', result);

                                // 3.  Send message to user that ask for catagory and also member to mention
                                const textMessage: TextMessage = {
                                    type: 'text',
                                    text: `อัพโหลดบิลสำเร็จ! โปรดระบุหมวดหมู่และผู้ที่ต้องการเรียกเก็บเงินได้ที่: https://your-domain.com/bill-form?imageId=${imageId}&imageUrl=${result?.secure_url}`,
                                };
                                pushMessage(userId, [textMessage]).then(resolve).catch(reject);
                            });

                            Readable.from(buffer).pipe(uploadStream);
                        });
                    }
                }
            }

            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}

// Helper function to convert stream to ArrayBuffer
async function streamToArrayBuffer(stream: NodeJS.ReadableStream): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
            resolve(Buffer.concat(chunks).buffer);
        });
    });
}

// **CRITICAL:**  Disable body parsing to receive the raw LINE event.
export const config = {
    api: {
        bodyParser: false,
    },
};
