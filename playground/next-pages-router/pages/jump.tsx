import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/rich",
      permanent: false,
    },
  };
};

export default function JumpPage() {
  return null;
}
