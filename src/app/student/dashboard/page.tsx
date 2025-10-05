"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, QrCode, CheckCircle } from "lucide-react";
import { studentAttendanceData } from "@/lib/dummy-data";
import { BrowserMultiFormatReader } from "@zxing/library";

interface ScheduleItem {
  id: string;
  subject: string;
  time: string;
  room: string;
  instructor: string;
  type: "Lecture" | "Lab" | "Tutorial";
  status: "upcoming" | "ongoing" | "completed";
  attendanceMarked?: boolean;
}

export default function StudentDashboard() {
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedbackError, setFeedbackError] = useState("");
  const [selectedLecture, setSelectedLecture] = useState<ScheduleItem | null>(
    null
  );
  const [scheduleView, setScheduleView] = useState<"today" | "weekly">("today");
  const [markedAttendance, setMarkedAttendance] = useState<Set<string>>(
    new Set()
  );

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const codeReaderRef = useRef(null);

  // Mock data for the current student
  const studentInfo = {
    name: "John Doe",
    enrollmentNo: "EN2023001",
    semester: "4th",
    branch: "Computer Science",
  };

  // Mock schedule data
  const weeklySchedule: Record<string, ScheduleItem[]> = {
    Monday: [
      {
        id: "mon-1",
        subject: "Data Structures",
        time: "09:00 - 10:30",
        room: "Room 101",
        instructor: "Dr. Smith",
        type: "Lecture",
        status: "ongoing",
      },
      {
        id: "mon-2",
        subject: "Database Systems",
        time: "11:00 - 12:30",
        room: "Lab 2",
        instructor: "Prof. Johnson",
        type: "Lab",
        status: "completed",
      },
      {
        id: "mon-2",
        subject: "System Architecture",
        time: "1:00 - 1:30",
        room: "Lab 2",
        instructor: "Prof. Michael Brown",
        type: "Lab",
        status: "ongoing",
      },
    ],
    Tuesday: [
      {
        id: "tue-1",
        subject: "Algorithms",
        time: "09:00 - 10:30",
        room: "Room 102",
        instructor: "Dr. Davis",
        type: "Lecture",
        status: "ongoing",
      },
      {
        id: "tue-2",
        subject: "Operating Systems",
        time: "11:00 - 12:30",
        room: "Room 103",
        instructor: "Prof. Wilson",
        type: "Lecture",
        status: "upcoming",
      },
      {
        id: "tue-3",
        subject: "Computer Networks",
        time: "14:00 - 15:30",
        room: "Lab 1",
        instructor: "Dr. Brown",
        type: "Lab",
        status: "upcoming",
      },
    ],
    Wednesday: [
      {
        id: "wed-1",
        subject: "Software Engineering",
        time: "09:00 - 10:30",
        room: "Room 104",
        instructor: "Prof. Taylor",
        type: "Lecture",
        status: "upcoming",
      },
    ],
    Thursday: [
      {
        id: "thu-1",
        subject: "Machine Learning",
        time: "09:00 - 10:30",
        room: "Room 105",
        instructor: "Dr. Anderson",
        type: "Lecture",
        status: "upcoming",
      },
    ],
    Friday: [
      {
        id: "fri-1",
        subject: "Web Development",
        time: "09:00 - 10:30",
        room: "Lab 3",
        instructor: "Prof. Garcia",
        type: "Lab",
        status: "upcoming",
      },
    ],
    Saturday: [
      {
        id: "fri-1",
        subject: "Web Development",
        time: "09:00 - 10:30",
        room: "Lab 3",
        instructor: "Prof. Garcia",
        type: "Lab",
        status: "upcoming",
      },
      {
        id: "mon-1",
        subject: "Data Structures",
        time: "09:00 - 10:30",
        room: "Room 101",
        instructor: "Dr. Smith",
        type: "Lecture",
        status: "ongoing",
      },
      {
        id: "mon-2",
        subject: "Database Systems",
        time: "11:00 - 12:30",
        room: "Lab 2",
        instructor: "Prof. Johnson",
        type: "Lab",
        status: "completed",
      },
      {
        id: "mon-2",
        subject: "System Architecture",
        time: "1:00 - 1:30",
        room: "Lab 2",
        instructor: "Prof. Michael Brown",
        type: "Lab",
        status: "ongoing",
      },
    ],
  };

  // Get today's day name
  const getTodayName = () => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date().getDay()];
  };

  // Get today's schedule
  const todaySchedule = weeklySchedule[getTodayName()] || [];

  // List of subjects for feedback
  const subjects = [
    "Data Structures",
    "Algorithms",
    "Database Systems",
    "Operating Systems",
    "Computer Networks",
  ];

  // Check if today is Friday and show feedback form after marking attendance
  const checkForFeedbackDay = () => {
    const today = new Date();
    return today.getDay() === 1; // 5 is Friday
  };

  // Initialize the QR code reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    };
  }, []);

  // Function to start camera and handle QR scanning for specific lecture
  const handleScanQRForLecture = async (lecture: ScheduleItem) => {
    setSelectedLecture(lecture);
    setShowQrScanner(true);
    setScanning(true);
    setCameraError("");

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const videoInputDevices =
        await codeReaderRef.current.listVideoInputDevices();

      let selectedDeviceId = undefined;

      const backCamera = videoInputDevices.find((device) => {
        return (
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear")
        );
      });

      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log("QR Code detected:", result.getText());
            stopScanner();
            const scannedPasscode = result.getText();
            setPasscode(scannedPasscode);
            setShowQrScanner(false);
            setShowAttendanceForm(true);
          }

          if (error && !(error instanceof TypeError)) {
            console.error("QR Code scanning error:", error);
          }
        }
      );

      setHasCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(
        "Unable to access camera. Please ensure you've granted camera permissions."
      );
      setScanning(false);
    }
  };

  // Function to stop QR scanner
  const stopScanner = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
  };

  // Clean up resources when dialog closes
  useEffect(() => {
    if (!showQrScanner && scanning) {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [showQrScanner, scanning]);

  // Mock function to submit attendance
  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();

    if (passcode === "1234") {
      if (selectedLecture) {
        setMarkedAttendance((prev) => new Set(prev).add(selectedLecture.id));
      }
      setShowAttendanceForm(false);
      setAttendanceSuccess(true);
      setPasscode("");

      setTimeout(() => {
        setAttendanceSuccess(false);
        if (checkForFeedbackDay()) {
          setShowFeedbackForm(true);
        }
      }, 3000);
    } else {
      alert("Invalid passcode. Please try again.");
    }
  };

  // Handle rating change
  const handleRatingChange = (subject: string, rating: number) => {
    setRatings((prev) => ({
      ...prev,
      [subject]: rating,
    }));
    setFeedbackError("");
  };

  // Submit feedback
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();

    const allRated = subjects.every(
      (subject) => ratings[subject] && ratings[subject] > 0
    );

    if (!allRated) {
      setFeedbackError("Please rate all subjects before submitting.");
      return;
    }

    console.log("Submitted ratings:", ratings);
    setShowFeedbackForm(false);
    setRatings({});
  };

  // Calculate overall attendance percentage
  const calculateOverallAttendance = () => {
    const totalClasses = studentAttendanceData.reduce(
      (sum, subject) => sum + subject.totalClasses,
      0
    );
    const attendedClasses = studentAttendanceData.reduce(
      (sum, subject) => sum + subject.attendedClasses,
      0
    );
    return Math.round((attendedClasses / totalClasses) * 100);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "ongoing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "upcoming":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Student Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {studentInfo.name}!
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Logout
            </Button>
          </Link>
        </div>

        <Card className="mb-4 sm:mb-6 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg">
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="font-semibold text-sm sm:text-base">
                  {studentInfo.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Enrollment No
                </p>
                <p className="font-semibold text-sm sm:text-base">
                  {studentInfo.enrollmentNo}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Semester</p>
                <p className="font-semibold text-sm sm:text-base">
                  {studentInfo.semester}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Branch</p>
                <p className="font-semibold text-sm sm:text-base">
                  {studentInfo.branch}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="mb-4 sm:mb-6 grid w-full grid-cols-2 bg-white shadow-sm">
            <TabsTrigger value="schedule" className="text-xs sm:text-sm">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="records" className="text-xs sm:text-sm">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Attendance Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Class Schedule
                    </CardTitle>
                    <CardDescription className="text-sm">
                      View your daily and weekly class schedule
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant={scheduleView === "today" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScheduleView("today")}
                      className="flex-1 sm:flex-none text-xs sm:text-sm"
                    >
                      Today
                    </Button>
                    <Button
                      variant={
                        scheduleView === "weekly" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setScheduleView("weekly")}
                      className="flex-1 sm:flex-none text-xs sm:text-sm"
                    >
                      Weekly
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {scheduleView === "today" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      <h3 className="font-semibold text-base sm:text-lg">
                        Today's Schedule - {getTodayName()},{" "}
                        {new Date().toLocaleDateString()}
                      </h3>
                    </div>

                    {todaySchedule.length > 0 ? (
                      <div className="grid gap-4">
                        {todaySchedule.map((lecture) => {
                          const isAttendanceMarked =
                            markedAttendance.has(lecture.id) ||
                            lecture.status === "completed";

                          return (
                            <div
                              key={lecture.id}
                              className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow bg-white"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                                <div className="flex items-center gap-3">
                                  <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-semibold text-base sm:text-lg">
                                    {lecture.subject}
                                  </span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge
                                    className={getStatusColor(lecture.status)}
                                  >
                                    {lecture.status.charAt(0).toUpperCase() +
                                      lecture.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-500">Time</p>
                                  <p className="font-medium text-sm sm:text-base">
                                    {lecture.time}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Room</p>
                                  <p className="font-medium text-sm sm:text-base">
                                    {lecture.room}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Instructor
                                  </p>
                                  <p className="font-medium text-sm sm:text-base">
                                    {lecture.instructor}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                {isAttendanceMarked ? (
                                  <Badge
                                    variant="outline"
                                    className="text-green-600 border-green-600"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Attendance Already Marked
                                  </Badge>
                                ) : lecture.status === "upcoming" ||
                                  lecture.status === "ongoing" ? (
                                  <Button
                                    onClick={() =>
                                      handleScanQRForLecture(lecture)
                                    }
                                    size="sm"
                                    className="text-xs sm:text-sm"
                                  >
                                    <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Scan QR for Attendance
                                  </Button>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-green-600 border-green-600"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Attended
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-base sm:text-lg">
                          No classes scheduled for today
                        </p>
                        <p className="text-sm">Enjoy your free day!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      Weekly Schedule
                    </h3>

                    {Object.entries(weeklySchedule).map(([day, lectures]) => (
                      <div key={day} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm sm:text-md text-gray-800">
                            {day}
                          </h4>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>

                        {lectures.length > 0 ? (
                          <div className="grid gap-3 pl-2 sm:pl-4">
                            {lectures.map((lecture) => (
                              <div
                                key={lecture.id}
                                className="border rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                                  <span className="font-medium text-sm sm:text-base">
                                    {lecture.subject}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-gray-600">
                                  <span>{lecture.time}</span>
                                  <span>{lecture.room}</span>
                                  <span>{lecture.instructor}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 pl-2 sm:pl-4">
                            No classes scheduled
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">
                  Attendance Records
                </CardTitle>
                <CardDescription className="text-sm">
                  Your attendance records for the current semester
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Overall Attendance
                      </h3>
                      <p className="text-sm text-gray-600">
                        Current semester performance
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {calculateOverallAttendance()}%
                      </span>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                  <Progress
                    value={calculateOverallAttendance()}
                    className="h-2 sm:h-3"
                  />
                </div>

                <div className="grid gap-4">
                  {studentAttendanceData.map((subject, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 sm:p-4 bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                        <h3 className="font-semibold text-base sm:text-lg">
                          {subject.subjectName}
                        </h3>
                        <div className="text-right">
                          <span className="text-lg sm:text-xl font-bold text-gray-900">
                            {Math.round(
                              (subject.attendedClasses / subject.totalClasses) *
                                100
                            )}
                            %
                          </span>
                        </div>
                      </div>

                      <Progress
                        value={Math.round(
                          (subject.attendedClasses / subject.totalClasses) * 100
                        )}
                        className="h-2 mb-3"
                      />

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-600 gap-2">
                        <span>
                          {subject.attendedClasses} out of{" "}
                          {subject.totalClasses} classes attended
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {attendanceSuccess && (
                  <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4 text-center text-green-700">
                    <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">
                      Attendance marked successfully!
                    </p>
                    <p className="text-sm">
                      Your attendance has been recorded.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog
        open={showQrScanner}
        onOpenChange={(open) => {
          if (!open) stopScanner();
          setShowQrScanner(open);
        }}
      >
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
              Scanning QR Code
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedLecture ? (
                <>
                  Point your camera at the QR code for{" "}
                  <strong>{selectedLecture.subject}</strong>
                </>
              ) : (
                "Point your camera at the QR code to scan"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-2">
            {cameraError ? (
              <div className="text-center text-red-500 p-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-sm">{cameraError}</p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setShowQrScanner(false)}
                  size="sm"
                >
                  Close
                </Button>
              </div>
            ) : (
              <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-white opacity-50 rounded m-8">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500"></div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4 text-center">
              {!cameraError && "Position the QR code within the green frame"}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowQrScanner(false)}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Form Dialog */}
      <Dialog open={showAttendanceForm} onOpenChange={setShowAttendanceForm}>
        <DialogContent className="mx-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Mark Attendance
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedLecture ? (
                <>
                  Confirm attendance for{" "}
                  <strong>{selectedLecture.subject}</strong>
                </>
              ) : (
                "Enter the passcode provided by your faculty to mark your attendance"
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAttendance}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="enrollmentNo" className="text-sm">
                    Enrollment No
                  </Label>
                  <Input
                    id="enrollmentNo"
                    value={studentInfo.enrollmentNo}
                    disabled
                    className="bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="subject" className="text-sm">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={selectedLecture?.subject || "Data Structures"}
                    disabled
                    className="bg-gray-50 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm">
                    Date
                  </Label>
                  <Input
                    id="date"
                    value={new Date().toLocaleDateString()}
                    disabled
                    className="bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="time" className="text-sm">
                    Time
                  </Label>
                  <Input
                    id="time"
                    value={
                      selectedLecture?.time || new Date().toLocaleTimeString()
                    }
                    disabled
                    className="bg-gray-50 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="passcode" className="text-sm">
                  Passcode
                </Label>
                <Input
                  id="passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode provided by faculty"
                  required
                  className="text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For demo: use "1234"
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAttendanceForm(false)}
                size="sm"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feedback Form Dialog */}
      <Dialog
        open={showFeedbackForm}
        onOpenChange={(open) => {
          if (!open) {
            const allRated = subjects.every(
              (subject) => ratings[subject] && ratings[subject] > 0
            );
            if (!allRated) {
              setFeedbackError(
                "Please complete your feedback for all subjects."
              );
              return;
            }
            setShowFeedbackForm(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Weekly Lecture Feedback
            </DialogTitle>
            <DialogDescription className="text-sm">
              Please rate your lectures for this week. Your feedback helps
              improve teaching quality.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitFeedback}>
            <div className="space-y-4 sm:space-y-6 py-4 max-h-[60vh] overflow-y-auto">
              {subjects.map((subject) => (
                <div key={subject} className="space-y-2">
                  <Label className="text-sm sm:text-base font-medium">
                    {subject}
                  </Label>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingChange(subject, star)}
                        className={`text-xl sm:text-2xl transition-colors hover:scale-110 ${
                          (ratings[subject] || 0) >= star
                            ? "text-yellow-500"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-xs sm:text-sm text-gray-500">
                      {ratings[subject]
                        ? `${ratings[subject]} star${
                            ratings[subject] !== 1 ? "s" : ""
                          }`
                        : "Not rated"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {feedbackError && (
              <div className="mb-4 text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-200">
                {feedbackError}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="w-full sm:w-auto">
                Submit Feedback
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
