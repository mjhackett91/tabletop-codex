// client/src/components/ViewToggle.jsx - Toggle between table/list/grid views
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";

export const VIEW_MODES = {
  TABLE: "table",
  LIST: "list",
  GRID: "grid"
};

export default function ViewToggle({ viewMode, onViewModeChange, storageKey = "defaultView" }) {
  const handleChange = (event, newView) => {
    if (newView !== null) {
      onViewModeChange(newView);
      // Store preference in localStorage
      try {
        localStorage.setItem(`viewMode_${storageKey}`, newView);
      } catch (e) {
        console.warn("Failed to save view preference:", e);
      }
    }
  };

  return (
    <ToggleButtonGroup
      value={viewMode}
      exclusive
      onChange={handleChange}
      aria-label="view mode"
      size="small"
    >
      <ToggleButton value={VIEW_MODES.TABLE} aria-label="table view">
        <Tooltip title="Table View">
          <TableChartIcon />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value={VIEW_MODES.LIST} aria-label="list view">
        <Tooltip title="List View">
          <ViewListIcon />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value={VIEW_MODES.GRID} aria-label="grid view">
        <Tooltip title="Grid View">
          <GridViewIcon />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
