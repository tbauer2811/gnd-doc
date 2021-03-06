import { Fragment } from "react";
import CodingTable from "../tables/CodingTable.js";
import References from "./References.js";
import Examples from "./Examples.js";
import Characteristics from "./Characteristics.js";
import styles from "./FieldDetail.module.css";

export default function FieldDetail(props) {
  const field = props.data;
  // console.log('field',field)
  const rows = [];
  const row0 = {
    label: field?.label ?? "",
    format: {},
    repetition: field.statements?.repetition?.occurrences[0].value,
  };
  if (field.statements?.encoding) {
    for (const [key, value] of Object.entries(
      field.statements.encoding.format
    )) {
      // console.log(`${key}: ${value}`)
      row0["format"][key] = value;
    }
    rows.push(row0);
    field.statements.subfields?.occurrences.map((subfield, index) => {
      let row = {
        label: subfield.label ?? "",
        format: {},
        repetition: subfield.qualifiers?.repetition?.occurrences[0].value,
      };
      for (const [key, value] of Object.entries(subfield.coding.format)) {
        // console.log(`${key}: ${value}`)
        row["format"][key] = value;
      }
      // subfield.coding.occurrences.map((coding,index) => {
      // let key = coding.qualifiers.type.occurrences[0].label
      // row['format'][key] = coding.value
      // })
      rows.push(row);
    });
  }
  // console.log('rows',rows)
  return (
    <>
      <title>{field.label}</title>
      <section className={styles.detail}>
        <h1>{field.label}</h1>
        <h2>{field.statements.definition?.label}</h2>
        {field.statements.definition?.occurrences.map((occurrence, index) => {
          return <p key={index}>{occurrence.value}</p>;
        })}
        <CodingTable data={rows} />
        <h2>{field.statements.implementationprovisions?.label}</h2>
        {field.statements.implementationprovisions?.occurrences.map(
          (occurrence, index) => {
            return <p key={index}>{occurrence.value}</p>;
          }
        )}
        <h2>{field.statements.examples?.label}</h2>
        <Examples examples={field.statements.examples} />
        <h2>{field.statements.validation?.label}</h2>
        {field.statements.validation?.occurrences.map((occurrence, index) => {
          return <p key={index}>{occurrence.value}</p>;
        })}
        <h2 id={field.statements.subfields?.label}>
          {field.statements.subfields?.label}
        </h2>
        {field.statements.subfields?.occurrences.map((subfield, index) => {
          // console.log('subfield',subfield)
          return (
            <Fragment key={index}>
              <h3 id={subfield.label}>{subfield.label}</h3>
              {subfield.qualifiers?.description?.occurrences.map((desc) => (
                <p key={index}>{desc.value}</p>
              ))}
              {subfield.qualifiers?.permittedcharacteristics && (
                <Characteristics
                  characteristics={subfield.qualifiers.permittedcharacteristics}
                />
              )}
              <h4>{subfield.qualifiers?.examples?.label}</h4>
              <Examples examples={subfield.qualifiers?.examples} />
              {subfield.references && (
                <References references={subfield.references} />
              )}
            </Fragment>
          );
        })}
      </section>
    </>
  );
}
