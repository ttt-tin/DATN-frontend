import React from "react";

const Visualization: React.FC = () => {
  const quickSightUrl =
    "https://us-east-1.quicksight.aws.amazon.com/sn/dashboards/YOUR_DASHBOARD_ID";

  return (
    <div style={{ height: "100%", width: "100%", padding: "16px" }}>
      <iframe
        title="Test dashboard"
        width="960"
        height="720"
        src="https://ap-southeast-2.quicksight.aws.amazon.com/sn/accounts/537124968279/dashboards/e4dd0497-ff29-4985-82c4-d378afb1a33a?directory_alias=BKHealth"
      />
    </div>
  );
};

export default Visualization;
