import { Stack } from "@mui/material";
import "./index.css";
import Sidebar from "../../components/Sidebar";
import { Outlet } from "react-router";

const Dashboard = () => {
  return (
    <Stack
      maxWidth="100%"
      className="home-layout"
      flexDirection="row"
      gap={14}
      sx={{ backgroundColor: "#FCFCFD" }}
    >
      <Sidebar />
      <Outlet />
    </Stack>
  );
};

export default Dashboard;
