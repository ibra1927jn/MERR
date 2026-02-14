import { logger } from '@/utils/logger';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { databaseService } from '../services/database.service';
import { attendanceService } from '../services/attendance.service';
import { Picker, AppUser, AttendanceRecord } from '../types';

export const useAttendance = (appUser: AppUser | undefined) => {
    const [roster, setRoster] = useState<Picker[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null); // ID being processed

    // Load Data
    const loadData = useCallback(async () => {
        if (!appUser?.id) return;
        setLoading(true);
        try {
            // 1. Fetch My Full Roster
            const myPickers = await databaseService.getPickersByTeam(appUser.id);
            setRoster(myPickers);

            // 2. Fetch Today's Attendance
            const currentOrchardId = appUser.orchard_id;
            if (currentOrchardId) {
                const todayRecords = await attendanceService.getDailyAttendance(currentOrchardId);
                setAttendance(todayRecords as AttendanceRecord[]);
            }
        } catch (err) {
             
            logger.error("Failed to load attendance data:", err);
        } finally {
            setLoading(false);
        }
    }, [appUser?.id, appUser?.orchard_id]);

    // Initial Load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Actions
    const checkIn = async (pickerId: string) => {
        if (!appUser?.orchard_id) {
            throw new Error("No orchard assigned.");
        }
        setProcessing(pickerId);
        try {
            await attendanceService.checkInPicker(pickerId, appUser.orchard_id, appUser.id);
            await loadData();
        } finally {
            setProcessing(null);
        }
    };

    const checkOut = async (attendanceId: string) => {
        setProcessing(attendanceId);
        try {
            await attendanceService.checkOutPicker(attendanceId);
            await loadData();
        } finally {
            setProcessing(null);
        }
    };

    // Derived State
    const mergedList = useMemo(() => {
        return roster.map(picker => {
            const record = attendance.find(a => a.picker_id === picker.id);
            return {
                ...picker,
                attendanceRecord: record,
                isPresent: !!record && !record.check_out_time
            };
        });
    }, [roster, attendance]);

    const stats = useMemo(() => {
        const present = mergedList.filter(p => p.isPresent).length;
        const absent = mergedList.length - present;
        return { present, absent, total: mergedList.length };
    }, [mergedList]);

    return {
        roster,
        attendance,
        loading,
        processing,
        refresh: loadData,
        checkIn,
        checkOut,
        mergedList,
        stats
    };
};