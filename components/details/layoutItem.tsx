import { Statement } from "@/types/entity";
import { Item } from "@/types/item";
import Header from "../layout/header";
import ReactHtmlParser from "react-html-parser";

interface Occurance {
  id: string;
  label: string;
  link: string;
  qualifiers?: string;
  value?: string;
  references?: any;
}

export default {
  [Item["example(typeoflayout)"]]: (occurance: Occurance) =>
    ReactHtmlParser(`<p class="example">${occurance.value}</p>`),
  [Item.italic]: (occurance: Occurance) => (
    <p className={"italic"}>{occurance.value}</p>
  ),
  [Item.bold]: (occurance: Occurance) => (
    <p className={"bold"}>
      <b>{occurance.value}</b>
    </p>
  ),
  [Item.firstordersubheading]: (occurance: Occurance, headerLevel: number) => (
    <Header
      label={occurance.value}
      id={occurance.value}
      level={(headerLevel = headerLevel + 0)}
    />
  ),
  [Item.secondordersubheading]: (occurance: Occurance, headerLevel: number) => (
    <Header
      label={occurance.value}
      id={occurance.value}
      level={(headerLevel = headerLevel + 1)}
    />
  ),
  [Item.thirdordersubheading]: (occurance: Occurance, headerLevel: number) => (
    <Header
      label={occurance.value}
      id={occurance.value}
      level={(headerLevel = headerLevel + 2)}
    />
  ),
  [Item["enumeration,uncounted"]]: (
    occurance: Occurance,
    _headerLevel: number,
    index: number,
    statement: Statement,
    groupedLists: object
  ) => (
    <ItemList
      occurance={occurance}
      statement={statement}
      index={index}
      itemId={Item["enumeration,uncounted"]}
      groupedLists={groupedLists}
    />
  ),
  [Item["enumeration,counted"]]: (
    occurance: Occurance,
    _headerLevel: number,
    index: number,
    statement: Statement,
    groupedLists: object
  ) => (
    <ItemList
      occurance={occurance}
      statement={statement}
      index={index}
      itemId={Item["enumeration,counted"]}
      groupedLists={groupedLists}
    />
  ),
};

function ItemList({ statement, index, itemId, occurance, groupedLists }) {
  // const filteredStatements = statement.occurrences.filter(
  //   (occ: any) =>
  //     occ.qualifiers?.typeoflayout &&
  //     occ.qualifiers.typeoflayout.occurrences[0].id === itemId
  // );
  // const cond =
  //   filteredStatements.findIndex((s) => s.value === occurance.value) + 1 ===
  //   filteredStatements.length;

  // todo: not ideal, structure data in StatementComp
  const cond = index in groupedLists;
  return (
    <>
      {cond && (
        <ListContainer ordered={Item["enumeration,counted"] === itemId}>
          {groupedLists[index].map((listObject: any) => (
            <li key={listObject.value}>{listObject.value}</li>
          ))}
        </ListContainer>
      )}
    </>
  );
}

function ListContainer({ children, ordered = false }) {
  return ordered ? <ol>{children}</ol> : <ul>{children}</ul>;
}
