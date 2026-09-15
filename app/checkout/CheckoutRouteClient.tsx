"use client";

import dynamic from "next/dynamic";
import styles from "./checkout.module.css";

const CheckoutClient = dynamic(() => import("./CheckoutClient"), {
  ssr: false,
  loading: () => <CheckoutShell />,
});

export default function CheckoutRouteClient() {
  return <CheckoutClient />;
}

function CheckoutShell() {
  return (
    <div className={styles.page}>
      <section className={styles.paper} aria-busy="true">
        <h1>영냥이에게 건네는 복채</h1>
        <p className={styles.intro}>결제 정보를 불러오고 있어요.</p>
      </section>
    </div>
  );
}
