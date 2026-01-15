import * as React from "react";
import { useState, useEffect } from "react";
import { Repeat, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface RecurrenceConfig {
  frequency: "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval: number;
  weekdays: string[]; // MO, TU, WE, TH, FR, SA, SU
  monthlyType: "day" | "weekday"; // by day of month or nth weekday
  monthDay?: number;
  endType: "never" | "date" | "count";
  endDate?: Date;
  endCount?: number;
  timezone: string;
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
  startDate?: Date;
}

const WEEKDAYS = [
  { value: "MO", label: "M" },
  { value: "TU", label: "T" },
  { value: "WE", label: "W" },
  { value: "TH", label: "T" },
  { value: "FR", label: "F" },
  { value: "SA", label: "S" },
  { value: "SU", label: "S" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
];

const DEFAULT_CONFIG: RecurrenceConfig = {
  frequency: "none",
  interval: 1,
  weekdays: [],
  monthlyType: "day",
  endType: "never",
  timezone: "America/New_York",
};

export function RecurrenceSelector({
  value,
  onChange,
  startDate,
}: RecurrenceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = value || DEFAULT_CONFIG;

  const handleFrequencyChange = (frequency: RecurrenceConfig["frequency"]) => {
    if (frequency === "none") {
      onChange(null);
      return;
    }

    const newConfig: RecurrenceConfig = {
      ...config,
      frequency,
      weekdays: frequency === "weekly" ? ["MO"] : [],
    };
    onChange(newConfig);
  };

  const toggleWeekday = (day: string) => {
    const newWeekdays = config.weekdays.includes(day)
      ? config.weekdays.filter((d) => d !== day)
      : [...config.weekdays, day];
    onChange({ ...config, weekdays: newWeekdays });
  };

  const getDisplayText = () => {
    if (!value || value.frequency === "none") return "Does not repeat";

    const freq = value.frequency;
    const interval = value.interval;

    let text = "";
    switch (freq) {
      case "daily":
        text = interval === 1 ? "Daily" : `Every ${interval} days`;
        break;
      case "weekly":
        text = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
        if (value.weekdays.length > 0) {
          text += ` on ${value.weekdays.join(", ")}`;
        }
        break;
      case "monthly":
        text = interval === 1 ? "Monthly" : `Every ${interval} months`;
        break;
      case "yearly":
        text = interval === 1 ? "Yearly" : `Every ${interval} years`;
        break;
      case "custom":
        text = "Custom";
        break;
    }

    if (value.endType === "date" && value.endDate) {
      text += ` until ${format(value.endDate, "MMM d, yyyy")}`;
    } else if (value.endType === "count" && value.endCount) {
      text += `, ${value.endCount} times`;
    }

    return text;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            {getDisplayText()}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select
              value={config.frequency}
              onValueChange={(v) => handleFrequencyChange(v as RecurrenceConfig["frequency"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.frequency !== "none" && (
            <>
              {/* Interval */}
              <div className="space-y-2">
                <Label>Every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={config.interval}
                    onChange={(e) =>
                      onChange({ ...config, interval: parseInt(e.target.value) || 1 })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.frequency === "daily" && (config.interval === 1 ? "day" : "days")}
                    {config.frequency === "weekly" && (config.interval === 1 ? "week" : "weeks")}
                    {config.frequency === "monthly" && (config.interval === 1 ? "month" : "months")}
                    {config.frequency === "yearly" && (config.interval === 1 ? "year" : "years")}
                  </span>
                </div>
              </div>

              {/* Weekly: Day selection */}
              {config.frequency === "weekly" && (
                <div className="space-y-2">
                  <Label>On days</Label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={config.weekdays.includes(day.value) ? "default" : "outline"}
                        className="w-8 h-8 p-0 text-xs"
                        onClick={() => toggleWeekday(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly type */}
              {config.frequency === "monthly" && (
                <div className="space-y-2">
                  <Label>Repeat on</Label>
                  <RadioGroup
                    value={config.monthlyType}
                    onValueChange={(v) =>
                      onChange({ ...config, monthlyType: v as "day" | "weekday" })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="day" id="day" />
                      <Label htmlFor="day" className="font-normal">
                        Day {startDate ? format(startDate, "d") : "of the month"}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekday" id="weekday" />
                      <Label htmlFor="weekday" className="font-normal">
                        {startDate
                          ? `The ${getNthWeekday(startDate)} ${format(startDate, "EEEE")}`
                          : "Same weekday of month"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* End condition */}
              <div className="space-y-2">
                <Label>Ends</Label>
                <RadioGroup
                  value={config.endType}
                  onValueChange={(v) =>
                    onChange({ ...config, endType: v as "never" | "date" | "count" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="never" />
                    <Label htmlFor="never" className="font-normal">Never</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="date" />
                    <Label htmlFor="date" className="font-normal">On date</Label>
                    {config.endType === "date" && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                          >
                            {config.endDate
                              ? format(config.endDate, "MMM d, yyyy")
                              : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={config.endDate}
                            onSelect={(date) =>
                              onChange({ ...config, endDate: date || undefined })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="count" id="count" />
                    <Label htmlFor="count" className="font-normal">After</Label>
                    {config.endType === "count" && (
                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={config.endCount || 10}
                          onChange={(e) =>
                            onChange({
                              ...config,
                              endCount: parseInt(e.target.value) || 10,
                            })
                          }
                          className="w-16 h-8"
                        />
                        <span className="text-sm">occurrences</span>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={config.timezone}
                  onValueChange={(v) => onChange({ ...config, timezone: v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getNthWeekday(date: Date): string {
  const day = date.getDate();
  const weekNum = Math.ceil(day / 7);
  const ordinals = ["first", "second", "third", "fourth", "fifth"];
  return ordinals[weekNum - 1] || "last";
}

// Helper to convert config to RRULE string
export function configToRRule(config: RecurrenceConfig | null): string | null {
  if (!config || config.frequency === "none") return null;

  const parts: string[] = [];

  // Frequency
  const freqMap: Record<string, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
    yearly: "YEARLY",
    custom: "DAILY",
  };
  parts.push(`FREQ=${freqMap[config.frequency]}`);

  // Interval
  if (config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`);
  }

  // Weekdays for weekly
  if (config.frequency === "weekly" && config.weekdays.length > 0) {
    parts.push(`BYDAY=${config.weekdays.join(",")}`);
  }

  // Monthly by day or weekday
  if (config.frequency === "monthly") {
    if (config.monthlyType === "day" && config.monthDay) {
      parts.push(`BYMONTHDAY=${config.monthDay}`);
    }
    // For weekday, we'd need more complex BYDAY like "2MO" for second Monday
  }

  // End condition
  if (config.endType === "date" && config.endDate) {
    parts.push(`UNTIL=${format(config.endDate, "yyyyMMdd")}T235959Z`);
  } else if (config.endType === "count" && config.endCount) {
    parts.push(`COUNT=${config.endCount}`);
  }

  return parts.join(";");
}

// Helper to parse RRULE string to config
export function rruleToConfig(rrule: string | null, timezone?: string): RecurrenceConfig | null {
  if (!rrule) return null;

  const config: RecurrenceConfig = { ...DEFAULT_CONFIG };
  if (timezone) config.timezone = timezone;

  // Parse FREQ
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  if (freqMatch) {
    const freqMap: Record<string, RecurrenceConfig["frequency"]> = {
      DAILY: "daily",
      WEEKLY: "weekly",
      MONTHLY: "monthly",
      YEARLY: "yearly",
    };
    config.frequency = freqMap[freqMatch[1]] || "daily";
  }

  // Parse INTERVAL
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  if (intervalMatch) {
    config.interval = parseInt(intervalMatch[1]);
  }

  // Parse BYDAY
  const bydayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
  if (bydayMatch) {
    config.weekdays = bydayMatch[1].split(",");
  }

  // Parse BYMONTHDAY
  const bymonthdayMatch = rrule.match(/BYMONTHDAY=(-?\d+)/);
  if (bymonthdayMatch) {
    config.monthDay = parseInt(bymonthdayMatch[1]);
    config.monthlyType = "day";
  }

  // Parse UNTIL
  const untilMatch = rrule.match(/UNTIL=(\d{8})/);
  if (untilMatch) {
    config.endType = "date";
    const y = untilMatch[1].slice(0, 4);
    const m = untilMatch[1].slice(4, 6);
    const d = untilMatch[1].slice(6, 8);
    config.endDate = new Date(`${y}-${m}-${d}`);
  }

  // Parse COUNT
  const countMatch = rrule.match(/COUNT=(\d+)/);
  if (countMatch) {
    config.endType = "count";
    config.endCount = parseInt(countMatch[1]);
  }

  return config;
}
