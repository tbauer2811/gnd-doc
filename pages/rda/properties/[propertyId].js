import Head from "next/head";
import Layout from "@/components/layout/layout";
import Sidebar from "@/components/sidebar/sidebar";
import * as sparql from "@/lib/sparql";
import { getElements, sortStatements, getEntity } from "@/lib/api";
import RdaNavigation from "@/components/layout/RdaNavigation";
import GeneralDetail from "@/components/general/GeneralDetail";
import Details from "@/components/details";

export default function Property({ field }) {
  const title =
    field.label && field.description
      ? field.label + " | " + field.description.replace(/ .*/, "")
      : "missing german entity label";

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <RdaNavigation />
      <section>
        {/* todo, sortStatements in api call */}
        <Details
          entity={{
            ...field,
            statements: sortStatements(field.statements),
          }}
        />
      </section>
    </>
  );
}

export async function getStaticProps({ params }) {
  // get API data
  const fieldId = params.propertyId;
  // const field = await getField(fieldId)
  const field = await getEntity(fieldId);

  if (!field) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      field: { ...field },
    },
    // revalidate: 100
  };
}

export async function getStaticPaths() {
  const fields = await getElements(sparql.RDAPROPERTIES);
  return {
    paths: Object.keys(fields).map((id) => ({
      params: { propertyId: id.toString() },
    })),
    fallback: false,
  };
}

Property.getLayout = function getLayout(page) {
  console.log("pagee", page);
  return (
    <Layout>
      <Sidebar active={page} />
      {page}
    </Layout>
  );
};
