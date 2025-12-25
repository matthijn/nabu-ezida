"use client";

import type { ReactNode } from "react";
import { Button } from "~/ui/components/Button";
import {
  FeatherCheck,
  FeatherChevronDown,
  FeatherChevronUp,
  FeatherCircle,
  FeatherLoader2,
} from "@subframe/core";

type TaskStatus = "done" | "loading" | "pending";

type Task = {
  label: string;
  status: TaskStatus;
  children?: Task[];
};

type StatusIconProps = {
  status: TaskStatus;
  size: "body" | "caption";
};

const statusIconClasses: Record<TaskStatus, string> = {
  done: "text-success-600",
  loading: "text-brand-600 animate-spin",
  pending: "text-neutral-400",
};

const StatusIcon = ({ status, size }: StatusIconProps) => {
  const sizeClass = size === "body" ? "text-body font-body" : "text-caption font-caption";
  const colorClass = statusIconClasses[status];
  const className = `${sizeClass} ${colorClass}`;

  switch (status) {
    case "done":
      return <FeatherCheck className={className} />;
    case "loading":
      return <FeatherLoader2 className={className} />;
    case "pending":
      return <FeatherCircle className={className} />;
  }
};

const labelClasses: Record<TaskStatus, Record<"body" | "caption", string>> = {
  done: {
    body: "text-body font-body text-default-font",
    caption: "text-caption font-caption text-subtext-color",
  },
  loading: {
    body: "text-body font-body text-default-font",
    caption: "text-caption font-caption text-subtext-color",
  },
  pending: {
    body: "text-body font-body text-neutral-400",
    caption: "text-caption font-caption text-neutral-400",
  },
};

type TaskItemProps = {
  task: Task;
  depth: number;
};

const TaskItem = ({ task, depth }: TaskItemProps) => {
  const size = depth === 0 ? "body" : "caption";
  const hasChildren = task.children && task.children.length > 0;

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <div className="flex w-full items-center gap-2">
        <StatusIcon status={task.status} size={size} />
        <span className={labelClasses[task.status][size]}>{task.label}</span>
      </div>
      {hasChildren && (
        <div className="flex w-full flex-col items-start gap-1 pl-6">
          {task.children!.map((child, i) => (
            <TaskItem key={i} task={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

type TaskProgressProps = {
  title: string;
  tasks: Task[];
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
};

export const TaskProgress = ({
  title,
  tasks,
  collapsed = false,
  onToggle,
  className = "",
}: TaskProgressProps) => {
  const isLoading = tasks.some(
    (t) => t.status === "loading" || t.children?.some((c) => c.status === "loading")
  );

  return (
    <div
      className={`flex w-full flex-col items-start gap-3 rounded-lg bg-default-background px-4 py-4 ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <FeatherLoader2 className="text-body font-body text-brand-600 animate-spin" />
          ) : (
            <FeatherCheck className="text-body font-body text-success-600" />
          )}
          <span className="text-body-bold font-body-bold text-default-font">{title}</span>
        </div>
        {onToggle && (
          <Button
            variant="neutral-tertiary"
            size="small"
            icon={collapsed ? <FeatherChevronUp /> : <FeatherChevronDown />}
            onClick={onToggle}
          />
        )}
      </div>
      {!collapsed && (
        <div className="flex w-full flex-col items-start gap-3 pl-6">
          {tasks.map((task, i) => (
            <TaskItem key={i} task={task} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
};

export type { Task, TaskStatus };
