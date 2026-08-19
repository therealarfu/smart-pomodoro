import React from "react";

export default function HourglassMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3h12M6 21h12M7 3c0 4 3.5 5.5 3.5 8s-3.5 4-3.5 8M17 3c0 4-3.5 5.5-3.5 8s3.5 4 3.5 8"
        stroke="var(--amber)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 6.5h6.6M8.7 17.5h6.6"
        stroke="var(--slate)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
