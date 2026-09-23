<template>
  <div class="page">

    <!-- =========================================================
         HEADER
    ========================================================== -->
    <div class="page-header">
      <div>
        <h1>Machine Schedule</h1>
        <div class="connection-status">
          <span
            class="connection-dot"
            :class="realtimeConnected ? 'connected' : 'disconnected'"
          ></span>

          <span v-if="realtimeConnected">
            LIVE • Realtime Connected
          </span>

          <span v-else>
            Reconnecting...
          </span>
        </div>
      </div>

      <div class="date-nav">
        <button @click="shiftDay(-1)">‹</button>

        <span class="date-label">
          {{ dateLabel }}
        </span>

        <span v-if="isToday" class="live-dot">
          ● LIVE
        </span>

        <button @click="shiftDay(1)">›</button>
      </div>
    </div>


    <!-- =========================================================
         OEE BAR
    ========================================================== -->
    <div class="oee-bar">

      <!-- OEE -->
      <div class="oee-metric main">
        <span class="label">PLANT OEE</span>

        <span class="value">
          {{ oee.oee }}%
        </span>

        <div class="bar">
          <div
            class="fill"
            :style="{ width: oee.oee + '%' }"
          ></div>
        </div>
      </div>


      <!-- Availability -->
      <div class="oee-metric">
        <span class="label">AVAILABILITY</span>

        <span class="value">
          {{ oee.availability }}%
        </span>

        <div class="bar">
          <div
            class="fill"
            :style="{ width: oee.availability + '%' }"
          ></div>
        </div>
      </div>


      <!-- Performance -->
      <div class="oee-metric">
        <span class="label">PERFORMANCE</span>

        <span class="value">
          {{ oee.performance }}%
        </span>

        <div class="bar">
          <div
            class="fill"
            :style="{ width: oee.performance + '%' }"
          ></div>
        </div>
      </div>


      <!-- Quality -->
      <div class="oee-metric">
        <span class="label">QUALITY</span>

        <span class="value">
          {{ oee.quality }}%
        </span>

        <div class="bar">
          <div
            class="fill"
            :style="{ width: oee.quality + '%' }"
          ></div>
        </div>
      </div>


      <!-- Output -->
      <div class="oee-metric">
        <span class="label">OUTPUT / TARGET</span>

        <span class="value small">
          {{ oee.produced }} / {{ oee.targetQty }}
        </span>
      </div>


      <!-- On Time -->
      <div class="oee-metric">
        <span class="label">ON-TIME</span>

        <span class="value">
          {{ oee.onTime }}%
        </span>
      </div>


      <!-- WIP -->
      <div
        class="oee-metric"
        :class="{ warn: oee.wipAtRisk > 0 }"
      >
        <span class="label">
          WIP · AT RISK
        </span>

        <span class="value">
          {{ oee.wipAtRisk }}
        </span>
      </div>

    </div>


    <!-- =========================================================
         SUMMARY
    ========================================================== -->
    <div class="summary-bar">

      <div class="summary-item">
        <span class="label">
          MACHINES
        </span>

        <span class="value">
          {{ machines.length }}
        </span>
      </div>


      <div class="summary-item">
        <span class="label">
          SCHEDULED TASKS TODAY
        </span>

        <span class="value">
          {{ tasksToday.length }}
        </span>
      </div>


      <div class="summary-item">
        <span class="label">
          RUNNING NOW
        </span>

        <span class="value">
          {{ runningNowCount }}
        </span>
      </div>


      <div class="summary-item">
        <span class="label">
          COMPLETED
        </span>

        <span class="value">
          {{ completedTodayCount }}
        </span>
      </div>


      <div class="summary-item">
        <span class="label">
          DELAYED
        </span>

        <span class="value danger-text">
          {{ delayedTodayCount }}
        </span>
      </div>


      <!-- Legend -->
      <div class="legend">

        <span>
          <i class="dot scheduled"></i>
          Scheduled
        </span>

        <span>
          <i class="dot progress"></i>
          In Progress
        </span>

        <span>
          <i class="dot completed"></i>
          Completed
        </span>

        <span>
          <i class="dot delayed"></i>
          Delayed / NCR
        </span>

      </div>

    </div>


    <!-- =========================================================
         LOADING
    ========================================================== -->
    <div
      v-if="loading"
      class="loading"
    >
      Loading machine schedule...
    </div>


    <!-- =========================================================
         TIMELINE
    ========================================================== -->
    <div
      v-else
      class="timeline-wrap"
    >

      <div class="timeline-scroll">

        <!-- =====================================================
             HOUR HEADER
        ====================================================== -->
        <div class="hour-header">

          <div class="machine-col-spacer">
            MACHINE
          </div>

          <div class="hours">

            <div
              v-for="h in 24"
              :key="h"
              class="hour-cell"
            >
              {{ String(h - 1).padStart(2, "0") }}:00
            </div>

          </div>

        </div>


        <!-- =====================================================
             CURRENT TIME LINE
        ====================================================== -->
        <div
          v-if="isToday"
          class="now-line"
          :style="{ left: nowLineLeft }"
        >
          <span class="now-badge">
            {{ nowLabel }}
          </span>
        </div>


        <!-- =====================================================
             MACHINE ROWS
        ====================================================== -->
        <div
          v-for="m in machines"
          :key="m.id"
          class="machine-row"
        >

          <!-- Machine Information -->
          <div class="machine-col">

            <strong>
              {{ m.name }}
            </strong>

            <span class="machine-sub">
              {{ m.type || "-" }}
            </span>

            <span
              class="pill"
              :class="statusClass(m.status)"
            >
              {{ m.status || "AVAILABLE" }}
            </span>

          </div>


          <!-- Timeline Track -->
          <div class="track">

            <!-- Grid -->
            <div class="grid-lines">

              <div
                v-for="h in 24"
                :key="h"
                class="grid-cell"
              ></div>

            </div>


            <!-- Tasks -->
            <div
              v-for="task in tasksFor(m.id)"
              :key="task.id"
              class="task-container"
            >

              <!-- Planned Bar -->
              <div
                class="task-bar planned-bar"
                :class="statusClass(task.status)"
                :style="plannedBarStyle(task)"
                :title="taskTooltip(task)"
              >
                <span class="task-title">
                  {{ task.process_plans?.order_no || "NO ORDER" }}
                  ·
                  {{ task.process_name || "Process" }}
                </span>

                <span class="task-status">
                  {{ task.status || "SCHEDULED" }}
                </span>
              </div>


              <!-- Actual Bar -->
              <div
                v-if="hasActualTime(task)"
                class="task-bar actual-bar"
                :class="statusClass(task.status)"
                :style="actualBarStyle(task)"
                :title="actualTooltip(task)"
              >
                <span>
                  ACTUAL
                </span>
              </div>

            </div>


            <!-- No Task -->
            <div
              v-if="tasksFor(m.id).length === 0"
              class="no-task"
            >
              No tasks scheduled
            </div>

          </div>

        </div>


        <!-- No Machines -->
        <div
          v-if="machines.length === 0"
          class="empty"
        >
          No machines registered.
        </div>

      </div>

    </div>


    <!-- =========================================================
         LAST UPDATE
    ========================================================== -->
    <div class="last-update">

      <span>
        Last updated:
        {{ lastUpdatedLabel }}
      </span>

      <button
        @click="manualRefresh"
        :disabled="loading"
      >
        ↻ Refresh
      </button>

    </div>

  </div>
</template>


<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted
} from "vue";

import { supabase } from "@/lib/supabase";


// =============================================================
// STATE
// =============================================================

const machines = ref([]);
const steps = ref([]);

const loading = ref(true);

const selectedDate = ref(new Date());

const currentTime = ref(new Date());

const realtimeConnected = ref(false);

const lastUpdated = ref(null);


// Realtime channel
let realtimeChannel = null;


// Clock interval
let clockInterval = null;


// =============================================================
// DATE
// =============================================================

const isToday = computed(() => {
  const selected = selectedDate.value;
  const today = currentTime.value;

  return (
    selected.getFullYear() === today.getFullYear() &&
    selected.getMonth() === today.getMonth() &&
    selected.getDate() === today.getDate()
  );
});


const dateLabel = computed(() => {
  return selectedDate.value.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
});


const dayStart = computed(() => {

  const d = new Date(
    selectedDate.value
  );

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;
});


const dayEnd = computed(() => {

  const d = new Date(
    dayStart.value
  );

  d.setDate(
    d.getDate() + 1
  );

  return d;
});


// =============================================================
// LIVE CLOCK
// =============================================================

const nowMinutes = computed(() => {

  const now = currentTime.value;

  return (
    now.getHours() * 60 +
    now.getMinutes() +
    now.getSeconds() / 60
  );
});


const nowLinePercent = computed(() => {

  if (!isToday.value) {
    return 0;
  }

  return (
    nowMinutes.value / 1440
  ) * 100;
});


/*
  Timeline has:

  180px machine column
  1440px timeline

  The .now-line is positioned relative
  to the complete timeline-scroll.
*/
const nowLineLeft = computed(() => {

  const timelineWidth = 1440;

  const machineWidth = 180;

  const percentage =
    nowLinePercent.value / 100;

  const left =
    machineWidth +
    timelineWidth * percentage;

  return `${left}px`;
});


const nowLabel = computed(() => {

  return currentTime.value
    .toTimeString()
    .slice(0, 5);
});


// =============================================================
// LAST UPDATED
// =============================================================

const lastUpdatedLabel = computed(() => {

  if (!lastUpdated.value) {
    return "Never";
  }

  return lastUpdated.value.toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
});


// =============================================================
// TASKS
// =============================================================

const tasksToday = computed(() => {

  return steps.value.filter(
    (s) =>
      s.planned_start &&
      overlapsDay(s)
  );

});


const runningNowCount = computed(() => {

  return steps.value.filter(
    (s) =>
      s.status === "IN_PROGRESS" ||
      s.status === "RUNNING"
  ).length;

});


const completedTodayCount = computed(() => {

  return tasksToday.value.filter(
    (s) =>
      s.status === "COMPLETED"
  ).length;

});


const delayedTodayCount = computed(() => {

  return tasksToday.value.filter(
    (s) =>
      s.status === "DELAYED" ||
      s.status === "NCR_HOLD" ||
      s.status === "MAINTENANCE" ||
      s.status === "STOPPED"
  ).length;

});


// =============================================================
// OEE
// =============================================================

function minutesBetween(a, b) {

  if (!a || !b) {
    return 0;
  }

  return Math.max(
    (
      new Date(b).getTime() -
      new Date(a).getTime()
    ) / 60000,
    0
  );

}


const oee = computed(() => {

  const tasks = tasksToday.value;

  let plannedMinutes = 0;
  let runMinutes = 0;
  let idealTimeMinutes = 0;

  let produced = 0;
  let rejected = 0;
  let targetQty = 0;

  let completedCount = 0;
  let onTimeCount = 0;

  let wipAtRisk = 0;

  const now =
    currentTime.value;


  for (const t of tasks) {

    // Planned time
    plannedMinutes +=
      minutesBetween(
        t.planned_start,
        t.planned_end
      );


    // Target quantity
    targetQty +=
      Number(
        t.process_plans?.quantity ?? 0
      );


    // Actual end
    let actualEnd =
      t.actual_end;


    if (
      !actualEnd &&
      (
        t.status === "IN_PROGRESS" ||
        t.status === "RUNNING"
      )
    ) {
      actualEnd =
        now.toISOString();
    }


    // Actual running time
    runMinutes +=
      minutesBetween(
        t.actual_start,
        actualEnd
      );


    // Quantity
    const qtyProduced =
      Number(
        t.qty_produced ?? 0
      );

    const qtyRejected =
      Number(
        t.qty_rejected ?? 0
      );


    produced +=
      qtyProduced;

    rejected +=
      qtyRejected;


    // Ideal cycle time
    if (
      t.estimated_cycle_minutes &&
      qtyProduced
    ) {

      idealTimeMinutes +=
        Number(
          t.estimated_cycle_minutes
        ) *
        qtyProduced;

    }


    // Completed
    if (
      t.status === "COMPLETED"
    ) {

      completedCount++;


      if (
        t.actual_end &&
        t.planned_end &&
        new Date(t.actual_end) <=
        new Date(t.planned_end)
      ) {

        onTimeCount++;

      }

    }


    // WIP at risk
    if (
      (
        t.status === "IN_PROGRESS" ||
        t.status === "RUNNING"
      ) &&
      t.planned_end &&
      now > new Date(t.planned_end)
    ) {

      wipAtRisk++;

    }

  }


  // Availability
  const availability =
    plannedMinutes > 0
      ? Math.min(
          (
            runMinutes /
            plannedMinutes
          ) * 100,
          100
        )
      : 0;


  // Performance
  const performance =
    runMinutes > 0
      ? Math.min(
          (
            idealTimeMinutes /
            runMinutes
          ) * 100,
          100
        )
      : 0;


  // Quality
  const quality =
    produced > 0
      ? Math.min(
          (
            (
              produced -
              rejected
            ) /
            produced
          ) * 100,
          100
        )
      : 0;


  // OEE
  const combined =
    (
      availability / 100
    ) *
    (
      performance / 100
    ) *
    (
      quality / 100
    ) *
    100;


  // On time
  const onTime =
    completedCount > 0
      ? (
          onTimeCount /
          completedCount
        ) * 100
      : 0;


  return {

    availability:
      availability.toFixed(0),

    performance:
      performance.toFixed(0),

    quality:
      quality.toFixed(0),

    oee:
      combined.toFixed(0),

    produced,

    targetQty,

    onTime:
      onTime.toFixed(0),

    wipAtRisk

  };

});


// =============================================================
// DAY FILTER
// =============================================================

function overlapsDay(task) {

  if (!task.planned_start) {
    return false;
  }


  const start =
    new Date(
      task.planned_start
    );


  const end =
    task.planned_end
      ? new Date(
          task.planned_end
        )
      : start;


  return (
    start < dayEnd.value &&
    end > dayStart.value
  );

}


// =============================================================
// GET TASKS FOR MACHINE
// =============================================================

function tasksFor(machineId) {

  return steps.value.filter(
    (s) =>
      s.machine_id === machineId &&
      overlapsDay(s)
  );

}


// =============================================================
// PERCENTAGE OF DAY
// =============================================================

function pctOfDay(date) {

  const clamped =
    new Date(
      Math.min(
        Math.max(
          date.getTime(),
          dayStart.value.getTime()
        ),
        dayEnd.value.getTime()
      )
    );


  const minutes =
    (
      clamped.getTime() -
      dayStart.value.getTime()
    ) / 60000;


  return (
    minutes / 1440
  ) * 100;

}


// =============================================================
// PLANNED BAR
// =============================================================

function plannedBarStyle(task) {

  if (!task.planned_start) {
    return {};
  }


  const start =
    new Date(
      task.planned_start
    );


  const end =
    task.planned_end
      ? new Date(
          task.planned_end
        )
      : new Date(
          start.getTime() +
          60 * 60000
        );


  const left =
    pctOfDay(start);


  const width =
    Math.max(
      pctOfDay(end) -
      left,
      1.5
    );


  return {

    left:
      left + "%",

    width:
      width + "%"

  };

}


// =============================================================
// ACTUAL BAR
// =============================================================

function actualBarStyle(task) {

  if (!task.actual_start) {
    return {};
  }


  const start =
    new Date(
      task.actual_start
    );


  let end;


  if (task.actual_end) {

    end =
      new Date(
        task.actual_end
      );

  }

  else if (
    task.status === "IN_PROGRESS" ||
    task.status === "RUNNING"
  ) {

    end =
      currentTime.value;

  }

  else {

    return {};

  }


  const left =
    pctOfDay(start);


  const width =
    Math.max(
      pctOfDay(end) -
      left,
      0.8
    );


  return {

    left:
      left + "%",

    width:
      width + "%"

  };

}


// =============================================================
// ACTUAL TIME CHECK
// =============================================================

function hasActualTime(task) {

  return !!(
    task.actual_start
  );

}


// =============================================================
// STATUS
// =============================================================

function statusClass(status) {

  if (
    status === "COMPLETED"
  ) {
    return "completed";
  }


  if (
    status === "IN_PROGRESS" ||
    status === "RUNNING"
  ) {
    return "progress";
  }


  if (
    status === "DELAYED" ||
    status === "NCR_HOLD" ||
    status === "MAINTENANCE" ||
    status === "STOPPED"
  ) {
    return "delayed";
  }


  return "scheduled";

}


// =============================================================
// TOOLTIP
// =============================================================

function taskTooltip(task) {

  const order =
    task.process_plans?.order_no ||
    "No Order";

  const process =
    task.process_name ||
    "Unknown Process";

  const status =
    task.status ||
    "SCHEDULED";

  return `
Order: ${order}
Process: ${process}
Status: ${status}
Planned Start: ${formatDateTime(task.planned_start)}
Planned End: ${formatDateTime(task.planned_end)}
Actual Start: ${formatDateTime(task.actual_start)}
Actual End: ${formatDateTime(task.actual_end)}
Produced: ${task.qty_produced ?? 0}
Rejected: ${task.qty_rejected ?? 0}
`;

}


function actualTooltip(task) {

  return `
ACTUAL PRODUCTION
Start: ${formatDateTime(task.actual_start)}
End: ${formatDateTime(task.actual_end)}
Produced: ${task.qty_produced ?? 0}
Rejected: ${task.qty_rejected ?? 0}
`;

}


function formatDateTime(value) {

  if (!value) {
    return "-";
  }


  return new Date(value)
    .toLocaleString(
      undefined,
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

}


// =============================================================
// DATE NAVIGATION
// =============================================================

function shiftDay(delta) {

  const d =
    new Date(
      selectedDate.value
    );


  d.setDate(
    d.getDate() +
    delta
  );


  selectedDate.value =
    d;

}


// =============================================================
// LOAD DATA
// =============================================================

async function load() {

  try {

    loading.value = true;


    const [
      machineRes,
      stepRes
    ] = await Promise.all([

      supabase
        .from("machines")
        .select("*")
        .order("name"),


      supabase
        .from("process_plan_steps")
        .select(
          `
          *,
          process_plans(
            order_no,
            part_name,
            quantity
          )
          `
        )
        .not(
          "machine_id",
          "is",
          null
        )

    ]);


    if (machineRes.error) {

      console.error(
        "Machine loading error:",
        machineRes.error
      );

    }


    if (stepRes.error) {

      console.error(
        "Process step loading error:",
        stepRes.error
      );

    }


    machines.value =
      machineRes.data ?? [];


    steps.value =
      stepRes.data ?? [];


    lastUpdated.value =
      new Date();

  }

  catch (error) {

    console.error(
      "Machine schedule loading error:",
      error
    );

  }

  finally {

    loading.value =
      false;

  }

}


// =============================================================
// MANUAL REFRESH
// =============================================================

async function manualRefresh() {

  await load();

}


// =============================================================
// REALTIME
// =============================================================

function subscribeToRealtime() {

  // Remove previous channel
  if (realtimeChannel) {

    supabase.removeChannel(
      realtimeChannel
    );

    realtimeChannel =
      null;

  }


  realtimeChannel =
    supabase
      .channel(
        "machine-gantt-live"
      )


      // -------------------------------------------------------
      // PROCESS PLAN STEPS
      // -------------------------------------------------------
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "process_plan_steps"
        },
        async (payload) => {

          console.log(
            "Realtime process plan update:",
            payload
          );


          await load();

        }
      )


      // -------------------------------------------------------
      // MACHINES
      // -------------------------------------------------------
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "machines"
        },
        async (payload) => {

          console.log(
            "Realtime machine update:",
            payload
          );


          await load();

        }
      )


      // -------------------------------------------------------
      // SUBSCRIBE
      // -------------------------------------------------------
      .subscribe(
        (status) => {

          console.log(
            "Realtime status:",
            status
          );


          if (
            status === "SUBSCRIBED"
          ) {

            realtimeConnected.value =
              true;

          }


          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {

            realtimeConnected.value =
              false;

          }

        }
      );

}


// =============================================================
// LIVE CLOCK
// =============================================================

function startLiveClock() {

  currentTime.value =
    new Date();


  /*
    Update every second.

    This makes:
      - current time line move
      - live clock update
      - running task actual bar update
      - OEE update
      - WIP at risk update
  */

  clockInterval =
    setInterval(() => {

      currentTime.value =
        new Date();

    }, 1000);

}


// =============================================================
// ON MOUNT
// =============================================================

onMounted(async () => {

  // Load initial data
  await load();


  // Start live clock
  startLiveClock();


  // Connect Supabase Realtime
  subscribeToRealtime();

});


// =============================================================
// ON UNMOUNT
// =============================================================

onUnmounted(() => {

  // Stop clock
  if (clockInterval) {

    clearInterval(
      clockInterval
    );

    clockInterval =
      null;

  }


  // Remove realtime
  if (realtimeChannel) {

    supabase.removeChannel(
      realtimeChannel
    );

    realtimeChannel =
      null;

  }


  realtimeConnected.value =
    false;

});

</script>


<style scoped>

/* ============================================================
   PAGE
============================================================ */

.page {
  padding: 24px;
  background: #f7f8fa;
  min-height: 100%;
}


/* ============================================================
   HEADER
============================================================ */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}


.page-header h1 {
  font-size: 20px;
  margin: 0 0 5px 0;
  color: #222;
}


.connection-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #777;
}


.connection-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}


.connection-dot.connected {
  background: #2e7d32;
  box-shadow: 0 0 5px rgba(46, 125, 50, 0.5);
}


.connection-dot.disconnected {
  background: #c62828;
}


.date-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}


.date-nav button {
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 18px;
}


.date-nav button:hover {
  background: #f2f2f2;
}


.date-label {
  font-weight: 600;
}


.live-dot {
  color: #2e7d32;
  font-size: 11px;
  font-weight: 600;
}


/* ============================================================
   OEE
============================================================ */

.oee-bar {
  display: grid;
  grid-template-columns:
    1.4fr
    1fr
    1fr
    1fr
    1fr
    0.8fr
    0.8fr;

  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}


.oee-metric {
  padding: 12px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 4px;
}


.oee-metric:last-child {
  border-right: none;
}


.oee-metric.main {
  background: #fafafa;
}


.oee-metric.warn {
  background: #fff5f5;
}


.oee-metric .label {
  font-size: 9px;
  color: #888;
  letter-spacing: 0.5px;
  font-weight: 700;
}


.oee-metric .value {
  font-size: 20px;
  font-weight: 700;
  color: #222;
}


.oee-metric .value.small {
  font-size: 16px;
}


.oee-metric.warn .value {
  color: #c62828;
}


.oee-metric .bar {
  height: 4px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 3px;
}


.oee-metric .fill {
  height: 100%;
  background: #1565c0;
  border-radius: 3px;
}


/* ============================================================
   SUMMARY BAR
============================================================ */

.summary-bar {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  margin-bottom: 12px;
}


.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}


.summary-item .label {
  font-size: 10px;
  color: #888;
  letter-spacing: 0.5px;
  font-weight: 600;
}


.summary-item .value {
  font-size: 20px;
  font-weight: 700;
}


.danger-text {
  color: #c62828;
}


.legend {
  margin-left: auto;
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: #666;
}


.legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}


.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}


.dot.scheduled {
  background: #9e9e9e;
}


.dot.progress {
  background: #1565c0;
}


.dot.completed {
  background: #2e7d32;
}


.dot.delayed {
  background: #c62828;
}


/* ============================================================
   LOADING / EMPTY
============================================================ */

.loading,
.empty {
  color: #888;
  padding: 40px 0;
  text-align: center;
}


/* ============================================================
   TIMELINE
============================================================ */

.timeline-wrap {
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  overflow: hidden;
}


.timeline-scroll {
  overflow-x: auto;
  position: relative;
}


/* ============================================================
   HOUR HEADER
============================================================ */

.hour-header {
  display: flex;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 4;
}


.machine-col-spacer {
  width: 180px;
  min-width: 180px;
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  color: #888;
  border-right: 1px solid #eee;
}


.hours {
  display: flex;
  min-width: 1440px;
}


.hour-cell {
  width: 60px;
  min-width: 60px;
  flex-shrink: 0;
  box-sizing: border-box;
  font-size: 10px;
  color: #888;
  padding: 8px 0 8px 4px;
  border-left: 1px solid #f2f2f2;
}


/* ============================================================
   CURRENT TIME LINE
============================================================ */

.now-line {
  position: absolute;
  top: 36px;
  bottom: 0;
  width: 2px;
  background: #7c4dff;
  z-index: 3;
  pointer-events: none;
}


.now-badge {
  position: absolute;
  top: -20px;
  left: -20px;
  background: #7c4dff;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
}


/* ============================================================
   MACHINE ROW
============================================================ */

.machine-row {
  display: flex;
  border-bottom: 1px solid #f2f2f2;
  min-height: 82px;
}


.machine-col {
  width: 180px;
  min-width: 180px;
  flex-shrink: 0;
  padding: 10px 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid #eee;
  background: #fff;
}


.machine-col strong {
  font-size: 12px;
  color: #222;
}


.machine-sub {
  font-size: 10px;
  color: #999;
}


.pill {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
}


.pill.scheduled {
  background: #eee;
  color: #666;
}


.pill.progress {
  background: #e3f2fd;
  color: #1565c0;
}


.pill.completed {
  background: #e8f5e9;
  color: #2e7d32;
}


.pill.delayed {
  background: #ffebee;
  color: #c62828;
}


/* ============================================================
   TRACK
============================================================ */

.track {
  position: relative;
  min-width: 1440px;
  width: 1440px;
  height: 82px;
  flex-shrink: 0;
}


.grid-lines {
  display: flex;
  position: absolute;
  inset: 0;
}


.grid-cell {
  width: 60px;
  min-width: 60px;
  flex-shrink: 0;
  border-left: 1px solid #f7f7f7;
  box-sizing: border-box;
}


/* ============================================================
   TASK CONTAINER
============================================================ */

.task-container {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 82px;
}


/* ============================================================
   TASK BAR
============================================================ */

.task-bar {
  position: absolute;
  box-sizing: border-box;
  border-radius: 5px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: default;
}


/* Planned task */
.planned-bar {
  top: 12px;
  height: 38px;
  padding: 5px 8px;
  z-index: 1;
}


.task-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  font-weight: 600;
}


.task-status {
  display: block;
  font-size: 8px;
  margin-top: 2px;
  opacity: 0.85;
}


/* Actual task */
.actual-bar {
  top: 54px;
  height: 18px;
  padding: 3px 7px;
  z-index: 2;
  font-size: 8px;
  font-weight: 700;
}


/* ============================================================
   TASK COLORS
============================================================ */

.planned-bar.scheduled {
  background: repeating-linear-gradient(
    45deg,
    #bdbdbd,
    #bdbdbd 4px,
    #cfcfcf 4px,
    #cfcfcf 8px
  );

  color: #333;
}


.planned-bar.progress {
  background: #1565c0;
  color: #fff;
}


.planned-bar.completed {
  background: #43a047;
  color: #fff;
}


.planned-bar.delayed {
  background: #e53935;
  color: #fff;
}


/* Actual bar */
.actual-bar.scheduled {
  background: #777;
  color: #fff;
}


.actual-bar.progress {
  background: #0d47a1;
  color: #fff;
}


.actual-bar.completed {
  background: #2e7d32;
  color: #fff;
}


.actual-bar.delayed {
  background: #b71c1c;
  color: #fff;
}


/* ============================================================
   NO TASK
============================================================ */

.no-task {
  position: absolute;
  left: 12px;
  top: 31px;
  font-size: 11px;
  color: #bbb;
}


/* ============================================================
   LAST UPDATE
============================================================ */

.last-update {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 10px;
  color: #999;
}


.last-update button {
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 10px;
  cursor: pointer;
}


.last-update button:hover {
  background: #f4f4f4;
}


.last-update button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


/* ============================================================
   RESPONSIVE
============================================================ */

@media (max-width: 1000px) {

  .page {
    padding: 12px;
  }


  .oee-bar {
    grid-template-columns:
      repeat(2, 1fr);
  }


  .summary-bar {
    flex-wrap: wrap;
    gap: 15px;
  }


  .legend {
    width: 100%;
    margin-left: 0;
    flex-wrap: wrap;
  }

}


@media (max-width: 700px) {

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }


  .oee-bar {
    grid-template-columns: 1fr;
  }


  .oee-metric {
    border-right: none;
    border-bottom: 1px solid #eee;
  }

}

</style>