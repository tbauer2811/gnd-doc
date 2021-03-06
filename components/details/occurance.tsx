import { Statement } from "@/types/entity";
import { Property } from "@/types/property";
import { Item } from "@/types/item";
import Link from "next/link";
import React, { Fragment } from "react";
import Collapsible from "react-collapsible";
import ReactHtmlParser from "react-html-parser";
import Detail from ".";
import Examples from "../fields/Examples";
import References from "../fields/References";
import layoutItem from "./layoutItem";
import Header from "../layout/header";

interface Props {
  occurance: {
    id: string;
    label: string;
    link: string;
    qualifiers?: any;
    value?: string;
    references?: any;
  };
  headerLevel: number;
  index: number;
  statement: Statement;
  groupedLists: object;
}

export default function Occurance({
  occurance,
  headerLevel,
  index,
  statement,
  groupedLists,
}: Props) {
  return (
    <>
      {occurance.id &&
        (statement.id === Property.subfields ||
          statement.id === Property.datafields) && (
          <Header
            label={occurance.label}
            id={occurance.id}
            level={headerLevel}
            link={occurance.link}
          />
        )}
      {occurance.id &&
        statement.id !== Property.subfields &&
        statement.id !== Property.datafields &&
        statement.id !== Property.examples && (
          <p className={"bold"}>
            &ensp;&ensp;&rArr;&ensp;
            <Link href={occurance.link}>
              <a>{occurance.label}</a>
            </Link>
          </p>
        )}
      {!occurance.id &&
        (!occurance.qualifiers ||
          !Object.keys(occurance.qualifiers).find(
            (el) => el === "typeoflayout"
          )) &&
        ReactHtmlParser(`<p>${occurance.value}</p>`)}

      {occurance.qualifiers && (
        <>
          {Object.entries(occurance.qualifiers).map(
            ([, qualifier]: any, index2: number) => (
              <Fragment key={index2}>
                {(qualifier.id === Property["see(item)"] ||
                  qualifier.id === Property["see(property)"]) &&
                  (qualifier.occurrences.length > 0 ? (
                    qualifier.occurrences.map((quali: any) => (
                      <p key={quali.label} className={"bold"}>
                        &ensp;&ensp;&rArr;&ensp;
                        <Link href={quali.link || ""}>
                          <a>{quali.label}</a>
                        </Link>
                      </p>
                    ))
                  ) : (
                    <p className={"bold"}>
                      &ensp;&ensp;&rArr;&ensp;FEHLENDER LINK
                    </p>
                  ))}
                {qualifier.id === Property.typeoflayout &&
                  layoutItem[qualifier.occurrences[0].id](
                    occurance,
                    headerLevel,
                    index,
                    statement,
                    groupedLists
                  )}
                {(qualifier.id === Property["embedded(item)"] ||
                  qualifier.id === Property["embedded(property)"]) &&
                  qualifier.occurrences.map((quali: any) => (
                    <Collapsible
                      key={index}
                      openedClassName={
                        quali.statements.elementof.occurrences[0].id ===
                          Item.gnddatafield
                          ? "CollapsibleOpenGnd"
                          : "CollapsibleOpenRda"
                      }
                      open={true}
                      overflowWhenOpen={"unset"}
                      trigger={
                        <span>Weiterf??hrende Informationen &#8744; </span>
                      }
                      triggerWhenOpen={<span>&#8743; </span>}
                      triggerClassName={
                        quali.statements.elementof.occurrences[0].id ===
                          Item.gnddatafield
                          ? "CollapsibleClosedGnd"
                          : "CollapsibleClosedRda"
                      }
                      triggerOpenedClassName={"CollapsibleTriggerOpen"}
                      triggerElementProps={{
                        id: `Collapsible-${quali.label}-${headerLevel}`,
                      }}
                    >
                      {
                        <Detail
                          entity={quali}
                          headerLevel={headerLevel + 1}
                          embedded={true}
                        />
                      }
                    </Collapsible>
                  ))}
                {qualifier.id === Property.examples && (
                  <>
                    <p className={"bold"}>{qualifier.label}: </p>
                    <Examples examples={qualifier} />
                  </>
                )}
                {qualifier.id === Property.description && (
                  <>
                    {qualifier.occurrences.map((quali: any) =>
                      quali.id ? (
                        <p key={quali.label} className={"bold"}>
                          &ensp;&ensp;&rArr;&ensp;
                          <Link href={quali.link || ""}>
                            <a>{quali.label}</a>
                          </Link>
                        </p>
                      ) : (
                        <p key={quali.label}>{quali.value}</p>
                      )
                    )}
                  </>
                )}
                {qualifier.id !== Property.typeoflayout &&
                  qualifier.id !== Property["see(item)"] &&
                  qualifier.id !== Property["see(property)"] &&
                  qualifier.id !== Property["typeoflayout(embeddedelement)"] &&
                  qualifier.id !== Property["embedded(item)"] &&
                  qualifier.id !== Property["embedded(property)"] &&
                  qualifier.id !== Property.description &&
                  qualifier.id !== Property.examples && (
                    <>
                      <p className={"bold"}>{qualifier.label}: </p>
                      {qualifier.occurrences.map((quali: any) =>
                        quali.id ? (
                          <p key={quali.label} className={"bold"}>
                            &ensp;&ensp;&rArr;&ensp;
                            <Link href={quali.link || ""}>
                              <a>{quali.label}</a>
                            </Link>
                          </p>
                        ) : (
                          <p key={quali.label}>{quali.value}</p>
                        )
                      )}
                    </>
                  )}
              </Fragment>
            )
          )}
        </>
      )}
      {occurance.references && <References references={occurance.references} />}
    </>
  );
}
