import Statement from "@/components/details/statement";
import Header from "@/components/layout/header";
import Entity from "@/types/entity";
import { Item } from "@/types/item";
import { Property } from "@/types/property";
import Table from "./table";

interface Props {
  entity: Entity;
  headerLevel: number;
}

export default function Detail({ entity, headerLevel = 1 }: Props) {
  const groups = groupStatements(entity);
  // const isEmbedded = headerLevel !== 1

  console.log("entity", entity, "groups", groups);
  return (
    <>
      <Header
        label={entity.label}
        id={entity.id}
        level={headerLevel}
        editor={true}
      />
      {entity.statements.definition &&
        entity.statements.definition.occurrences.map((occ) => (
          <p key={occ.value}>{occ.value}</p>
        ))}
      {groups && (
        <>
          <Table entity={entity} statements={groups.table} />
          {groups.rest.map((statement, index) => (
            <Statement
              key={index}
              statement={statement}
              index={index}
              headerLevel={headerLevel + 1}
            />
          ))}
        </>
      )}
    </>
  );
}

const groupsDefinition = {
  [Item.rdaproperty]: {
    tableProperties: [
      Property["entitytype/domain"],
      Property.parentproperty,
      Property.standardelementfor,
      Property.subproperties,
    ],
    restProperties: [
      // Property.definition,
      Property.description,
      Property.examples,
      Property.recordingmethod,
      Property.sourcesofinformation,
      Property.basicrules,
      Property.specialrules,
      Property.specificrules,
    ],
  },
  [Item.gnddatafield]: {
    tableProperties: [
      // todo, add later
    ],
    restProperties: [
      // Property.definition,
      Property.description,
      Property.examples,
      Property.repetition,
      Property.subfields,
      Property.validation,
      Property.implementationprovisions,
    ],
  },
  [Item["dachdocumentation:rules"]]: {
    tableProperties: [],
    restProperties: [Property.description],
  },
};

const groupStatements = (entity: Entity) => {
  const relevantKey = entity.statements.elementof?.occurrences[0].id;
  if (groupsDefinition[relevantKey]) {
    return {
      table: Object.keys(entity.statements)
        .filter((key) =>
          groupsDefinition[relevantKey].tableProperties.find(
            (tProp: any) => entity.statements[key].id === tProp
          )
        )
        .map((key) => entity.statements[key]),
      rest: Object.keys(entity.statements)
        .filter((key) =>
          groupsDefinition[relevantKey].restProperties.find(
            (rProp: any) => entity.statements[key].id === rProp
          )
        )
        .map((key) => entity.statements[key]),
    };
  }
};