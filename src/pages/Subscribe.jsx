import { useNavigate } from "react-router-dom";
import styles from "./Subscribe.module.css";
import usePlan from "../hooks/usePlan";

export default function Subscribe() {
  const nav = useNavigate();
  const { plan } = usePlan();

  const goPay = (type) => {
    if (type === "gold") {
      window.open("https://wa.me/201010562664?text=I want Gold plan", "_blank");
    } else if (type === "silver") {
      window.open("https://wa.me/201010562664?text=I want Silver plan", "_blank");
    }
  };

  const PlanCard = ({ title, price, features, type, highlight }) => (
    <div className={`${styles.card} ${highlight ? styles.highlight : ""}`}>
      <h2>{title}</h2>
      <h3>{price}</h3>
      <ul>
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>

      {plan === type ? (
        <button className={styles.current}>Current Plan</button>
      ) : type === "free" ? (
        <button className={styles.btn} onClick={() => nav("/")}>
          Start Free
        </button>
      ) : (
        <button className={styles.btn} onClick={() => goPay(type)}>
          Upgrade
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <h1>Choose Your Plan</h1>
      <p>Start free and upgrade anytime</p>

      <div className={styles.grid}>
        <PlanCard
          title="Free"
          price="0 EGP"
          type="free"
          features={[
            "10 Patients",
            "Appointments",
            "Basic Dashboard",
            "No Gallery",
            "No WhatsApp",
          ]}
        />

        <PlanCard
          title="Silver"
          price="99 EGP / month"
          type="silver"
          features={[
            "Unlimited Patients",
            "Appointments",
            "Full Records",
            "No Gallery",
            "No WhatsApp",
          ]}
        />

        <PlanCard
          title="Gold"
          price="149 EGP / month"
          type="gold"
          highlight
          features={[
            "Unlimited Patients",
            "Gallery",
            "WhatsApp",
            "Reminders",
          ]}
        />
      </div>
    </div>
  );
}
