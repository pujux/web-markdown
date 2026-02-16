import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", 'attachment; filename="report.csv"');
  res.end("id,name\n1,alpha\n2,beta\n");

  return {
    props: {},
  };
};

export default function FilePage() {
  return null;
}
