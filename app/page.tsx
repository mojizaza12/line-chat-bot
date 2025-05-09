// pages/bill-form.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner" // Import toast from sonner
import { Checkbox } from "@/components/ui/checkbox"
import { useTheme } from "next-themes"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"
import { DatePicker } from "@/components/date-picker"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Image from 'next/image';

const FormSchema = z.object({
    category: z.string().min(2, {
        message: "Category must be at least 2 characters.",
    }),
    members: z.array(z.string()).optional(),
    amount: z.number().min(1, {
        message: "Amount must be greater than 0.",
    }),
    date: z.date()
})

export default function BillForm() {
    const router = useRouter();
    const { imageUrl } = router.query;  // Get imageUrl from query params
    const [mentionedMembers, setMentionedMembers] = useState<string[]>([]);


    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            category: "",
            members: [],
            amount: 0,
            date: new Date()
        },
    })


    const onSubmit = async (values: z.infer<typeof FormSchema>) => {
        // Handle form submission (send data to Google Sheets, etc.)
        console.log("Form values:", values);
        toast.success("You submitted the form successfully!"); // Use toast from sonner
        toast.info((
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4 font-mono text-white">
                <code className="break-words">{JSON.stringify(values, null, 2)}</code>
            </pre>
        ), {
            duration: 5000
        })
    }

    const dummyMembers = [
        { id: 'user1', name: 'Alice' },
        { id: 'user2', name: 'Bob' },
        { id: 'user3', name: 'Charlie' },
    ];

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-4">Bill Information</h1>

            {imageUrl && (
                <div className="mb-4">
                    <Image src={imageUrl as string} alt="Bill Image" width={300} height={200} />
                </div>
            )}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="food">Food</SelectItem>
                                        <SelectItem value="electricity">Electricity Bill</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    This is the category of expense
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input placeholder="Amount" type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormDescription>
                                    This is the amount of bill
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date of expense</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Date of expense
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div>
                        <Label>Mention Members</Label>
                        <div className="flex flex-wrap gap-2">
                            {dummyMembers.map((member) => (
                                <div key={member.id} className="flex items-center space-x-2">
                                    <FormField
                                        control={form.control}
                                        name="members"
                                        render={({ field }) => {
                                            return (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(member.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), member.id])
                                                                    : field.onChange(field.value?.filter((value) => value !== member.id))
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal space-x-3">
                                                        {member.name}
                                                    </FormLabel>
                                                </FormItem>
                                            )
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button type="submit">Submit</Button>
                </form>
            </Form>
        </div>
    );
}