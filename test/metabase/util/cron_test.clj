(ns metabase.util.cron-test
  "Tests for the util fns that convert things to and from frontend-friendly schedule map and cron strings.
   These don't test every possible combination but hopefully cover enough that we can be reasonably sure the
   logic is right."
  (:require
   [clojure.test :refer :all]
   [metabase.util.cron :as u.cron]))

(deftest ^:parallel schedule-map->cron-string-test
  (testing "basic schedule"
    (is (= "0 0 * * * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_type  "hourly"})))
    (is (= "0 0 0 * * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_type  "daily"})))
    (is (= "0 0 0 * * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_hour  0
             :schedule_type  "daily"})))
    (is (= "0 0 3 * * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_hour  3
             :schedule_type  "daily"})))
    (is (= "0 0 * * * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_type  "hourly"}))))
  (testing "more settings at once"
    (is (= "0 0 17 ? * 2#1 *"
           (u.cron/schedule-map->cron-string
            {:schedule_day   "mon"
             :schedule_frame "first"
             :schedule_hour  17
             :schedule_type  "monthly"})))
    (is (= "0 0 23 ? * 6L *"
           (u.cron/schedule-map->cron-string
            {:schedule_day   "fri"
             :schedule_frame "last"
             :schedule_hour  23
             :schedule_type  "monthly"})))
    (is (= "0 0 17 15 * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_frame "mid"
             :schedule_hour  17
             :schedule_type  "monthly"})))
    (is (= "0 0 0 1 * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_frame "first"
             :schedule_hour  0
             :schedule_type  "monthly"})))
    (is (= "0 0 0 L * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_frame "last"
             :schedule_hour  0
             :schedule_type  "monthly"})))
    (is (= "0 0 16 ? * 3 *"
           (u.cron/schedule-map->cron-string
            {:schedule_day   "tue"
             :schedule_hour  16
             :schedule_type  "weekly"})))))

(deftest cron-string->schedule-map-test
  (is (= {:schedule_day    nil
          :schedule_frame  nil
          :schedule_hour   nil
          :schedule_minute 0
          :schedule_type   "hourly"}
         (u.cron/cron-string->schedule-map "0 0 * * * ? *")))
  (is (= {:schedule_day    nil
          :schedule_frame  nil
          :schedule_minute 0
          :schedule_hour   0
          :schedule_type   "daily"}
         (u.cron/cron-string->schedule-map "0 0 0 * * ? *")))
  (is (= {:schedule_day    nil
          :schedule_frame  nil
          :schedule_minute 0
          :schedule_hour   3
          :schedule_type   "daily"}
         (u.cron/cron-string->schedule-map "0 0 3 * * ? *")))
  (is (= {:schedule_day    nil
          :schedule_frame  nil
          :schedule_hour   nil
          :schedule_minute 0
          :schedule_type   "hourly"}
         (u.cron/cron-string->schedule-map "0 0 * * * ? *")))
  (is (= {:schedule_day    "mon"
          :schedule_frame  "first"
          :schedule_hour   17
          :schedule_minute 0
          :schedule_type   "monthly"}
         (u.cron/cron-string->schedule-map "0 0 17 ? * 2#1 *")))
  (is (= {:schedule_day    "fri"
          :schedule_frame  "last"
          :schedule_hour   23
          :schedule_minute 0
          :schedule_type   "monthly"}
         (u.cron/cron-string->schedule-map "0 0 23 ? * 6L *")))
  (is (= {:schedule_day    "fri"
          :schedule_frame  "last"
          :schedule_hour   23
          :schedule_minute 0
          :schedule_type   "monthly"}
         (u.cron/cron-string->schedule-map "0 0 23 ? * 6L *")))
  (is (= {:schedule_day    nil
          :schedule_frame  "mid"
          :schedule_hour   17
          :schedule_minute 0
          :schedule_type   "monthly"}
         (u.cron/cron-string->schedule-map "0 0 17 15 * ? *")))
  (is (= {:schedule_day    nil
          :schedule_frame  nil
          :schedule_hour   nil
          :schedule_minute nil
          :schedule_type   "hourly"}
         (u.cron/cron-string->schedule-map "0 * * * * ? *")))
  (is (= {:schedule_day    nil
          :schedule_frame  "first"
          :schedule_hour   0
          :schedule_minute 0
          :schedule_type   "monthly"}
         (u.cron/cron-string->schedule-map "0 0 0 1 * ? *")))
  (is (= {:schedule_day    nil
          :schedule_frame  "last"
          :schedule_hour   0
          :schedule_minute 0
          :schedule_type   "monthly"}
         (u.cron/cron-string->schedule-map "0 0 0 L * ? *")))
  (is (= {:schedule_day    "tue"
          :schedule_frame  nil
          :schedule_hour   16
          :schedule_minute 0
          :schedule_type   "weekly"}
         (u.cron/cron-string->schedule-map "0 0 16 ? * 3 *"))))

;;; Monthly schedules pinned to a specific calendar day, e.g. "the 5th" -- see `u.cron/calendar-day-frames`.

(deftest ^:parallel calendar-day-frame->cron-string-test
  (testing "a calendar-day frame becomes a cron day-of-month"
    (is (= "0 0 8 5 * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_frame "day-5"
             :schedule_hour  8
             :schedule_type  "monthly"})))
    (is (= "0 0 0 28 * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_frame "day-28"
             :schedule_hour  0
             :schedule_type  "monthly"}))))
  (testing "\"day-15\" is an alias of \"mid\""
    (is (= (u.cron/schedule-map->cron-string
            {:schedule_frame "mid", :schedule_hour 8, :schedule_type "monthly"})
           (u.cron/schedule-map->cron-string
            {:schedule_frame "day-15", :schedule_hour 8, :schedule_type "monthly"}))))
  (testing "a calendar day wins over a day of the week rather than throwing"
    ;; pulses reject this pair in `valid-schedule?`, but the DB-sync schedule API shares this schema and does not
    (is (= "0 0 8 5 * ? *"
           (u.cron/schedule-map->cron-string
            {:schedule_day   "mon"
             :schedule_frame "day-5"
             :schedule_hour  8
             :schedule_type  "monthly"}))))
  (testing "days that don't occur every month are rejected, never silently widened to every day"
    (doseq [frame ["day-0" "day-29" "day-31" "day-99"]]
      (is (thrown? Exception
                   (u.cron/schedule-map->cron-string
                    {:schedule_frame frame, :schedule_hour 8, :schedule_type "monthly"}))
          frame))))

(deftest ^:parallel cron-string->calendar-day-frame-test
  (testing "a cron day-of-month becomes a calendar-day frame"
    (is (= {:schedule_day    nil
            :schedule_frame  "day-5"
            :schedule_hour   8
            :schedule_minute 0
            :schedule_type   "monthly"}
           (u.cron/cron-string->schedule-map "0 0 8 5 * ? *"))))
  (testing "the 1st, 15th and last day keep their older frame names"
    (are [cron-string expected-frame] (= expected-frame
                                         (:schedule_frame (u.cron/cron-string->schedule-map cron-string)))
      "0 0 8 1 * ? *"  "first"
      "0 0 8 15 * ? *" "mid"
      "0 0 8 L * ? *"  "last"))
  (testing "days that don't occur every month stay unrecognised, as before"
    (are [cron-string] (nil? (:schedule_frame (u.cron/cron-string->schedule-map cron-string)))
      "0 0 8 29 * ? *"
      "0 0 8 31 * ? *"))
  (testing "every frame survives the cron round trip that `send-pulses` trigger keys depend on"
    (doseq [frame u.cron/calendar-day-frames]
      (let [schedule-map {:schedule_frame frame, :schedule_hour 8, :schedule_type "monthly"}
            cron-string  (u.cron/schedule-map->cron-string schedule-map)]
        (is (= cron-string
               (-> cron-string u.cron/cron-string->schedule-map u.cron/schedule-map->cron-string))
            frame)))))
