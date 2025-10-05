"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentData } from "@/lib/dummy-data";

export default function StudentLogin() {
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Find student with matching enrollment number
    const student = studentData.find((s) => s.enrollmentNo === enrollmentNo);

    if (!student) {
      setError("Student not found");
      return;
    }

    // Check if password matches (last 4 digits of enrollment number)
    const lastFourDigits = enrollmentNo.slice(-4);
    if (password !== lastFourDigits) {
      setError("Invalid password");
      return;
    }

    // Successful login
    router.push("/student/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Student Login</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your enrollment number and password
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="enrollmentNo">Enrollment Number</Label>
              <Input
                id="enrollmentNo"
                type="text"
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                placeholder="Enter your enrollment number"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Last 4 digits of enrollment number"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Your password is the last 4 digits of your enrollment number
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
