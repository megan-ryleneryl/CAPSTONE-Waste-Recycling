// client/src/pages/PickupDashboard.js
const PickupDashboard = () => {
  const [activePickups, setActivePickups] = useState([]);
  const [completedPickups, setCompletedPickups] = useState([]);
  
  return (
    <div className="pickup-dashboard">
      <Tabs>
        <TabPanel label="Upcoming Pickups">
          {activePickups.map(pickup => (
            <PickupCard 
              key={pickup.pickupID}
              pickup={pickup}
              showActions={true}
            />
          ))}
        </TabPanel>
        
        <TabPanel label="Pickup History">
          {completedPickups.map(pickup => (
            <PickupHistoryCard 
              key={pickup.pickupID}
              pickup={pickup}
            />
          ))}
        </TabPanel>
      </Tabs>
    </div>
  );
};