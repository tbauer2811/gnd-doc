import cacheData from "memory-cache";
import * as sparql from "@/lib/sparql";
const API_URL = "http://doku.wikibase.wiki";
const endpointUrl = API_URL + "/query/proxy/wdqs/bigdata/namespace/wdq/sparql";

async function fetchWithCache(url, options) {
  const value = cacheData.get(url);
  if (value) {
    return value;
  } else {
    const hours = 24;
    const res = await fetch(url, options).then((response) => response.json());
    if (res.errors) {
      console.error(res.errors);
      throw new Error("Failed to fetch API");
    }
    cacheData.put(url, res, hours * 60 * 60);
    return res;
  }
}

class SPARQLQueryDispatcher {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
  query(sparqlQuery) {
    const fullUrl = this.endpoint + "?query=" + encodeURIComponent(sparqlQuery);
    const headers = { Accept: "application/sparql-results+json" };
    return fetchWithCache(fullUrl, { headers });
  }
}
const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);

export async function getFields() {
  const data = await fetchWithCache(
    API_URL + "/w/rest.php/gnd/doku/v1/datafields"
  );
  const fields = data.fields;
  const rows = [];
  Object.keys(fields).map((key) => {
    // every field needs a Property ID
    fields[key]["id"] = key;
    rows.push(fields[key]);
  });
  return rows;
}

export async function getRdaProperties() {
  const propertyIds = await getElements(sparql.RDAPROPERTIES);
  const lookup_en = await getElements(sparql.LABELEN);
  const lookup_de = await getLabels(sparql.LABELDE);
  const codings = await getCodings(sparql.CODINGS);
  // let exampleIds = recursiveSearch(property.claims, 'P11')
  // const examples = await getExamples( exampleIds )

  const list_url = [];
  Object.keys(propertyIds).map((key) => {
    var wikiurl =
      API_URL +
      "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
      key;
    list_url.push(wikiurl);
  });
  const arr = [];
  const asyncRes = await Promise.all(
    list_url.map(async (url, index) => {
      const content = await fetchWithCache(url);
      for (let key in content.entities) {
        const obj = await getEntity(key);
        arr.push(obj);
      }
      return;
    })
  );

  return arr;
}

export async function getElements(sparqlQuery) {
  const response = await queryDispatcher.query(sparqlQuery);
  const bindings = response.results.bindings;
  const obj = {};
  bindings.map((binding) => {
    var value_strip = binding["elementLabel"].value
      .toLowerCase()
      .split(" ")
      .join("");
    obj[binding["eId"].value] = {};
    obj[binding["eId"].value]["label"] = value_strip;
    obj[binding["eId"].value]["assignmentId"] = binding["assignmentId"]
      ? binding["assignmentId"].value
      : "";
    obj[binding["eId"].value]["assignmentLabel"] = binding["assignmentLabel"]
      ? binding["assignmentLabel"].value
      : "";
  });
  return obj;
}

export async function getLabels(sparqlQuery) {
  const response = await queryDispatcher.query(sparqlQuery);
  const bindings = response.results.bindings;
  const obj = {};
  bindings.map((binding) => {
    var label = binding["elementLabel"].value;
    var strip = label.indexOf(" - ");
    var strip2 = label.indexOf(" ??? ");
    if (strip > 0) {
      label = label.substring(strip + 3);
    }
    if (strip2 > 0) {
      label = label.substring(strip2 + 3);
    }
    obj[binding["eId"].value] = label;
  });
  return obj;
}

export async function getCodings(sparqlQuery) {
  const response = await queryDispatcher.query(sparqlQuery);
  const bindings = response.results.bindings;
  const obj = {};
  bindings.map((binding) => {
    var key = binding["eId"].value;
    var key_filter = bindings.filter((binding) => binding["eId"].value === key);
    obj[key] = {};
    obj[key]["label"] = binding["elementLabel"].value;
    obj[key]["coding"] = {};
    obj[key]["coding"]["format"] = {};
    key_filter.map(
      (binding) =>
      (obj[key]["coding"]["format"][binding["codingTypeLabel"].value] =
        binding["coding"].value)
    );
  });
  return obj;
}

async function getDescriptions() {
  const descriptionIds = await getElements(sparql.DESCRIPTIONS);

  const list_url = [];
  Object.keys(descriptionIds).map((key) => {
    var wikiurl =
      API_URL +
      "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
      key;
    list_url.push(wikiurl);
  });
  const wiki_res = {};
  const asyncRes = await Promise.all(
    list_url.map(async (url, index) => {
      const content = await fetchWithCache(url);
      for (let key in content.entities) {
        wiki_res[key] = content.entities[key];
      }
      return;
    })
  );

  const obj = {};
  for (const [key, obj] of Object.entries(wiki_res)) {
    obj[key] = {};
    obj[key]["id"] = obj["id"].value;
    obj[key]["label"] = obj["labels"]["de"].value;
    obj[key]["statements"] = {};
  }
  return obj;
}

async function getLink(elementId) {
  // let assignmentId = await lookup.assignmentId
  let link = "/entries/" + elementId;
  return link;
}

let entityCounter = 1;
async function recursiveRenderEntity(
  lookup_en,
  lookup_de,
  codings,
  id,
  entityCounter
) {
  const wikiurl =
    API_URL +
    "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
    id;
  const res = await fetchWithCache(wikiurl);
  const entity = res.entities[id];
  var label = entity.labels?.de?.value ?? "No Label Defined";
  var strip = label.indexOf(" - ");
  var strip2 = label.indexOf(" ??? ");
  if (strip > 0) {
    label = label.substring(strip + 3);
  }
  if (strip2 > 0) {
    label = label.substring(strip2 + 3);
  }
  // first level
  const obj = {};
  obj["id"] = id;
  obj["label"] = label;
  obj["entitycounter"] = entityCounter;
  obj["description"] = entity.descriptions?.de?.value ?? "";
  // second level
  obj["statements"] = {};
  await Promise.all(
    Object.keys(entity.claims).map(async (key) => {
      obj["statements"][lookup_en[key].label] = {};
      obj["statements"][lookup_en[key].label]["id"] = key;
      obj["statements"][lookup_en[key].label]["link"] = await getLink(key);
      obj["statements"][lookup_en[key].label]["label"] = lookup_de[key];
      if (key === "P4") {
        // integrate coding from codings const
        obj["statements"][lookup_en[key].label]["format"] = {};
        obj["statements"][lookup_en[key].label]["format"] =
          codings[id]["coding"]["format"];
      }
      if (codings[key] !== undefined) {
        obj["statements"][lookup_en[key].label]["coding"] =
          codings[key]["coding"];
      }
      obj["statements"][lookup_en[key].label]["occurrences"] = [];
      // third level
      await Promise.all(
        entity.claims[key].map(async (occurrence, index) => {
          if (
            occurrence.mainsnak.snaktype === "value" &&
            occurrence["mainsnak"]["datavalue"]["value"]["id"] !== undefined
          ) {
            let occurrence_id =
              occurrence["mainsnak"]["datavalue"]["value"]["id"];
            const statement_link = await getLink(occurrence_id);
            obj["statements"][lookup_en[key].label]["occurrences"][index] = {
              id: occurrence["mainsnak"]["datavalue"]["value"]["id"],
              label:
                lookup_de[occurrence["mainsnak"]["datavalue"]["value"]["id"]],
              link: statement_link,
            };
          } else if (
            occurrence["mainsnak"]["snaktype"] === "value" &&
            occurrence["mainsnak"]["datavalue"]["value"] !== undefined
          ) {
            obj["statements"][lookup_en[key].label]["occurrences"][index] = {
              value: occurrence["mainsnak"]["datavalue"]["value"],
            };
          } else {
            obj["statements"][lookup_en[key].label]["occurrences"][index] = {
              value: "",
            };
          }
          if (key === "P15") {
            // integrate coding in subfields (P15) object
            let occurrence_id =
              occurrence["mainsnak"]["datavalue"]["value"]["id"];
            obj["statements"][lookup_en[key].label]["occurrences"][index][
              "coding"
            ] = codings[occurrence_id]["coding"];
          }
          if (key === "P11" || key === "P396" || key === "P411") {
            // integrate example (P11) OR embedded item (P396) OR embedded property (P411)
            let occurrence_id =
              occurrence["mainsnak"]["datavalue"]["value"]["id"];
            // obj['statements'][lookup_en[key].label]['occurrences'][index]['statements'] = examples[occurrence_id]['statements']
            obj["statements"][lookup_en[key].label]["occurrences"][index] =
              await recursiveRenderEntity(
                lookup_en,
                lookup_de,
                codings,
                occurrence_id,
                entityCounter++
              );
          }
          // fourth level
          if (occurrence["qualifiers"] !== undefined) {
            obj["statements"][lookup_en[key].label]["occurrences"][index][
              "qualifiers"
            ] = {};
            await Promise.all(
              Object.keys(occurrence["qualifiers"]).map(
                async (quali_key, quali_index) => {
                  obj["statements"][lookup_en[key].label]["occurrences"][index][
                    "qualifiers"
                  ][lookup_en[quali_key].label] = {};
                  obj["statements"][lookup_en[key].label]["occurrences"][index][
                    "qualifiers"
                  ][lookup_en[quali_key].label]["label"] = lookup_de[quali_key];
                  obj["statements"][lookup_en[key].label]["occurrences"][index][
                    "qualifiers"
                  ][lookup_en[quali_key].label]["id"] = quali_key;
                  obj["statements"][lookup_en[key].label]["occurrences"][index][
                    "qualifiers"
                  ][lookup_en[quali_key].label]["occurrences"] = [];
                  if (codings[quali_key]) {
                    obj["statements"][lookup_en[key].label]["occurrences"][
                      index
                    ]["qualifiers"][lookup_en[quali_key].label]["coding"] =
                      codings[quali_key]["coding"];
                  }
                  // fifth level
                  await Promise.all(
                    occurrence["qualifiers"][quali_key].map(
                      async (occurrences2, index2) => {
                        let occurrences2_id = undefined;
                        if (occurrences2["datavalue"] !== undefined) {
                          occurrences2_id =
                            occurrences2["datavalue"]["value"]["id"];
                          if (occurrences2_id) {
                            const qualifier_link = await getLink(
                              occurrences2_id
                            );
                            obj["statements"][lookup_en[key].label][
                              "occurrences"
                            ][index]["qualifiers"][lookup_en[quali_key].label][
                              "occurrences"
                            ][index2] = {};
                            obj["statements"][lookup_en[key].label][
                              "occurrences"
                            ][index]["qualifiers"][lookup_en[quali_key].label][
                              "occurrences"
                            ][index2]["id"] = occurrences2_id;
                            obj["statements"][lookup_en[key].label][
                              "occurrences"
                            ][index]["qualifiers"][lookup_en[quali_key].label][
                              "occurrences"
                            ][index2]["label"] = lookup_de[occurrences2_id];
                            obj["statements"][lookup_en[key].label][
                              "occurrences"
                            ][index]["qualifiers"][lookup_en[quali_key].label][
                              "occurrences"
                            ][index2]["link"] = qualifier_link;
                            if (codings[occurrences2_id]) {
                              obj["statements"][lookup_en[key].label][
                                "occurrences"
                              ][index]["qualifiers"][
                                lookup_en[quali_key].label
                              ]["occurrences"][index2]["coding"] =
                                codings[occurrences2_id]["coding"];
                            }
                            if (
                              quali_key === "P11" ||
                              quali_key === "P396" ||
                              quali_key === "P411"
                            ) {
                              // integrate example (P11) OR embedded item (P396) OR embedded property (P411)
                              // obj['statements'][lookup_en[key]]['occurrences'][index]['qualifiers'][lookup_en[quali_key].label]['occurrences'][index2]['statements'] = items[occurrences2_id]['statements']
                              obj["statements"][lookup_en[key].label][
                                "occurrences"
                              ][index]["qualifiers"][
                                lookup_en[quali_key].label
                              ]["occurrences"][index2] =
                                await recursiveRenderEntity(
                                  lookup_en,
                                  lookup_de,
                                  codings,
                                  occurrences2_id,
                                  entityCounter++
                                );
                            }
                          } else if (occurrences2["datatype"] === "time") {
                            obj["statements"][lookup_en[key].label][
                              "occurrences"
                            ][index]["qualifiers"][lookup_en[quali_key].label][
                              "occurrences"
                            ][index2] = {
                              value: occurrences2["datavalue"]["value"]["time"],
                            };
                          } else {
                            obj["statements"][lookup_en[key].label][
                              "occurrences"
                            ][index]["qualifiers"][lookup_en[quali_key].label][
                              "occurrences"
                            ][index2] = {
                              value: occurrences2["datavalue"]["value"],
                            };
                          }
                        }
                      }
                    )
                  );
                }
              )
            );
          }
          if (occurrence["references"] !== undefined) {
            obj["statements"][lookup_en[key].label]["occurrences"][index][
              "references"
            ] = [];
            occurrence["references"].map((reference, ref_index) => {
              const ref_keys = Object.keys(reference["snaks"]);
              const ref_obj = {};
              ref_keys.map((ref_key) => {
                const ref = {
                  id: ref_key,
                  label: lookup_de[ref_key],
                  value: reference["snaks"][ref_key][0]["datavalue"]["value"],
                };
                ref_obj[lookup_en[ref_key].label] = ref;
              });
              obj["statements"][lookup_en[key].label]["occurrences"][index][
                "references"
              ][ref_index] = ref_obj;
            });
          }
        })
      );
    })
  );
  return obj;
}

export async function getEntity(entityId) {
  const lookup_en = await getElements(sparql.LABELEN);
  const lookup_de = await getLabels(sparql.LABELDE);
  const codings = await getCodings(sparql.CODINGS);
  const entity = await recursiveRenderEntity(
    lookup_en,
    lookup_de,
    codings,
    entityId,
    entityCounter
  );
  return entity;
}

// async function renderEntity(entity) {
//   const lookup_en = await getElements(sparql.LABELEN);
//   const lookup_de = await getLabels(sparql.LABELDE);
//   const codings = await getCodings(sparql.CODINGS);
//   let exampleIds = recursiveSearch(entity, "P11");
//   let examples = {};
//   if (exampleIds.length > 0) {
//     examples = await getExamples(exampleIds);
//   }
//   var obj = {};
//   // first level (OBJ)
//   obj["id"] = entity["id"];
//   obj["label"] = entity["labels"]["de"].value;
//   // second level (OBJ)
//   obj["statements"] = {};
//   for (const [key, claim] of Object.entries(entity.claims)) {
//     obj["statements"][lookup_en[key].label] = {};
//     obj["statements"][lookup_en[key].label]["id"] = key;
//     obj["statements"][lookup_en[key].label]["label"] = lookup_de[key];
//     // insert codings if possible (OBJ)
//     if (codings[key]) {
//       obj["statements"][lookup_en[key].label]["coding"] =
//         codings[key]["coding"];
//     }
//     // third level (ARR)
//     // const occurrences_arr =  property.claims[key]
//     // occurrences_arr.map((occurrences,index) => {
//     // const occurrences_id = occurrences['mainsnak']['datavalue']['value']['id']
//     // if (occurrences_id) {
//     // obj['statements'][lookup_en[key].label]['occurrences'][index] = {'id':occurrences_id,'label':lookup_de[occurrences_id]}
//     // } else {
//     // obj['statements'][lookup_en[key].label]['occurrences'][index] = {'value':occurrences['mainsnak']['datavalue']['value']}
//     // }
//     obj["statements"][lookup_en[key].label]["occurrences"] = [];
//     claim.map((occ, index) => {
//       if (occ["mainsnak"]["datavalue"]["value"]["id"]) {
//         obj["statements"][lookup_en[key].label]["occurrences"][index] = {
//           id: occ["mainsnak"]["datavalue"]["value"]["id"],
//           label: lookup_de[occ["mainsnak"]["datavalue"]["value"]["id"]],
//         };
//       }
//       if (occ["mainsnak"]["datavalue"]["value"]) {
//         obj["statements"][lookup_en[key].label]["occurrences"][index] = {
//           value: occ["mainsnak"]["datavalue"]["value"],
//         };
//       }
//       // fourth level (OBJ)
//       // obj['statements'][lookup_en[key].label]['occurrences'][index]['qualifiers'] = {}
//       // const qualifiers_arr = Object.keys(occurrences['qualifiers'])
//       // qualifiers_arr.map((quali_key,quali_index) => {
//       // obj['statements'][lookup_en[key].label]['occurrences'][index]['qualifiers'][lookup_en[quali_key].label] = {}
//       // obj['statements'][lookup_en[key].label]['occurrences'][index]['qualifiers'][lookup_en[quali_key].label]['label'] = lookup_de[quali_key]
//       // obj['statements'][lookup_en[key].label]['occurrences'][index]['qualifiers'][lookup_en[quali_key].label]['id'] = quali_key
//       // obj['statements'][lookup_en[key].label]['occurrences'][index]['qualifiers'][lookup_en[quali_key].label]['occurrences'] = []
//       if (occ["qualifiers"]) {
//         obj["statements"][lookup_en[key].label]["occurrences"][index][
//           "qualifiers"
//         ] = {};
//         for (const [key4, qualifier] of Object.entries(occ.qualifiers)) {
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[key4].label] = {};
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[key4].label]["label"] = lookup_de[key4];
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[key4].label]["id"] = key4;
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[key4].label]["occurrences"] = [];
//           // insert codings if possible (OBJ)
//           if (codings[key4]) {
//             obj["statements"][lookup_en[key].label]["occurrences"][index][
//               "qualifiers"
//             ][lookup_en[key4].label]["coding"] = codings[key4]["coding"];
//           }
//           // fifth level (ARR)
//           qualifier.map((quali_value, quali_index) => {
//             obj["statements"][lookup_en[key].label]["occurrences"][index][
//               "qualifiers"
//             ][lookup_en[key4].label]["occurrences"][quali_index] = {};
//             if (quali_value["datatype"] === "string") {
//               obj["statements"][lookup_en[key].label]["occurrences"][index][
//                 "qualifiers"
//               ][lookup_en[key4].label]["occurrences"][quali_index]["value"] =
//                 quali_value["datavalue"]["value"];
//             }
//             if (
//               quali_value["datatype"] === "wikibase-item" &&
//               quali_value["snaktype"] === "value"
//             ) {
//               obj["statements"][lookup_en[key].label]["occurrences"][index][
//                 "qualifiers"
//               ][lookup_en[key4].label]["occurrences"][quali_index] = {
//                 id: quali_value["datavalue"]["value"]["id"],
//                 label: lookup_de[quali_value["datavalue"]["value"]["id"]],
//               };
//             }
//             if (
//               quali_value["datatype"] === "wikibase-property" &&
//               quali_value["snaktype"] === "value"
//             ) {
//               let property = quali_value["datavalue"]["value"]["id"];
//               if (codings[property]) {
//                 obj["statements"][lookup_en[key].label]["occurrences"][index][
//                   "qualifiers"
//                 ][lookup_en[key4].label]["value"] = codings[property]["coding"];
//               }
//             }
//             if (
//               quali_value["datavalue"] &&
//               quali_value["datavalue"]["type"] === "wikibase-entityid"
//             ) {
//               let property = quali_value["datavalue"]["value"]["id"];
//               if (codings[property]) {
//                 obj["statements"][lookup_en[key].label]["occurrences"][index][
//                   "qualifiers"
//                 ][lookup_en[key4].label]["value"] = codings[property]["coding"];
//               }
//             }
//             if (key4 === "P11") {
//               obj["statements"][lookup_en[key].label]["occurrences"][index][
//                 "qualifiers"
//               ][lookup_en[key4].label]["occurrences"][quali_index][
//                 "statements"
//               ] =
//                 examples[quali_value["datavalue"]["value"]["id"]]["statements"];
//             }
//           });
//         }
//       }
//     });
//   }
//   return obj;
// }

// async function getItems(linkedItems) {
//   const itemIds = linkedItems.toString().replace(/,/g, "|");
//   // const res = await fetchWithCache(API_URL + '/w/api.php?action=wbgetentities&format=json&languages=de&ids=' + itemIds)
//   const res = await fetchWithCache(
//     API_URL +
//       "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
//       itemIds
//   );
//   let items = {};
//   for (const [key, value] of Object.entries(res["entities"])) {
//     const entity = await renderEntity(value);
//     items[entity.id] = entity;
//   }
//   return items;
// }

export async function getExample(exampleId) {
  const lookup_en = await getElements(sparql.LABELEN);
  const lookup_de = await getLabels(sparql.LABELDE);
  const codings = await getCodings(sparql.CODINGS);
  const res = await fetchWithCache(
    API_URL +
    "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
    exampleId
  );
  const element = res.entities[exampleId];
  const items = await getItems(linkedItems);
  // first level
  const obj = {};
  obj["id"] = element["id"];
  obj["label"] = element["labels"]["de"].value;
  // second level
  obj["statements"] = {};
  Object.keys(element.claims).map((claim_key) => {
    obj["statements"][lookup_en[claim_key].label] = {};
    obj["statements"][lookup_en[claim_key].label]["id"] = claim_key;
    obj["statements"][lookup_en[claim_key].label]["label"] =
      lookup_de[claim_key];
    if (codings[claim_key] !== undefined) {
      obj["statements"][lookup_en[claim_key].label]["coding"] =
        codings[claim_key]["coding"];
    }
    obj["statements"][lookup_en[claim_key].label]["occurrences"] = [];
    // third level
    element.claims[claim_key].map((occurrence, index) => {
      if (
        occurrence.mainsnak.snaktype === "value" &&
        occurrence["mainsnak"]["datavalue"]["value"]["id"] !== undefined
      ) {
        obj["statements"][lookup_en[claim_key].label]["occurrences"][index] = {
          id: occurrence["mainsnak"]["datavalue"]["value"]["id"],
          label: lookup_de[occurrence["mainsnak"]["datavalue"]["value"]["id"]],
        };
      } else if (
        occurrence["mainsnak"]["snaktype"] === "value" &&
        occurrence["mainsnak"]["datavalue"]["value"] !== undefined
      ) {
        obj["statements"][lookup_en[claim_key].label]["occurrences"][index] = {
          value: occurrence["mainsnak"]["datavalue"]["value"],
        };
      } else {
        obj["statements"][lookup_en[claim_key].label]["occurrences"][index] = {
          value: "",
        };
      }
      // fourth level
      if (occurrence["qualifiers"] !== undefined) {
        obj["statements"][lookup_en[claim_key].label]["occurrences"][index][
          "qualifiers"
        ] = {};
        const qualifiers_arr = Object.keys(occurrence["qualifiers"]);
        qualifiers_arr.map(async (quali_key) => {
          obj["statements"][lookup_en[claim_key].label]["occurrences"][index][
            "qualifiers"
          ][lookup_en[quali_key].label] = {};
          obj["statements"][lookup_en[claim_key].label]["occurrences"][index][
            "qualifiers"
          ][lookup_en[quali_key].label]["label"] = lookup_de[quali_key];
          obj["statements"][lookup_en[claim_key].label]["occurrences"][index][
            "qualifiers"
          ][lookup_en[quali_key].label]["id"] = quali_key;
          // include coding block, if qualifier is property with coding
          if (codings[quali_key]) {
            obj["statements"][lookup_en[claim_key].label]["occurrences"][index][
              "qualifiers"
            ][lookup_en[quali_key].label]["coding"] =
              codings[quali_key]["coding"];
          }
          // fifth level
          let linkedItems = [];
          occurrence["qualifiers"][quali_key].map(
            (quali_value, quali_index) => {
              if (
                quali_value["property"] === "P396" ||
                quali_value["property"] === "P411"
              ) {
                linkedItems.push(quali_value["datavalue"]["value"]["id"]);
              }
            }
          );
          if (linkedItems.length > 0) {
            let items = [];
            items = await getItems(linkedItems);
            obj["statements"][lookup_en[claim_key].label]["occurrences"][index][
              "qualifiers"
            ][lookup_en[quali_key].label]["occurrences"] = items;
          }
          occurrence["qualifiers"][quali_key].map(
            (quali_value, quali_index) => {
              if (quali_value["datatype"] === "string") {
                obj["statements"][lookup_en[claim_key].label]["occurrences"][
                  index
                ]["qualifiers"][lookup_en[quali_key].label]["value"] =
                  quali_value["datavalue"]["value"];
              }
              if (
                quali_value["datatype"] === "wikibase-item" &&
                quali_value["snaktype"] === "value"
              ) {
                obj["statements"][lookup_en[claim_key].label]["occurrences"][
                  index
                ]["qualifiers"][lookup_en[quali_key].label]["value"] = {
                  id: quali_value["datavalue"]["value"]["id"],
                  label: lookup_de[quali_value["datavalue"]["value"]["id"]],
                };
              }
              if (
                quali_value["datatype"] === "wikibase-property" &&
                quali_value["snaktype"] === "value"
              ) {
                let property = quali_value["datavalue"]["value"]["id"];
                if (codings[property]) {
                  obj["statements"][lookup_en[claim_key].label]["occurrences"][
                    index
                  ]["qualifiers"][lookup_en[quali_key].label]["value"] =
                    codings[property]["coding"];
                }
              }
              if (
                quali_value["datavalue"] &&
                quali_value["datavalue"]["type"] === "wikibase-entityid"
              ) {
                let property =
                  occurrence["qualifiers"][quali_key][0]["datavalue"]["value"][
                  "id"
                  ];
                if (codings[property]) {
                  obj["statements"][lookup_en[claim_key].label]["occurrences"][
                    index
                  ]["qualifiers"][lookup_en[quali_key].label]["value"] =
                    codings[property]["coding"];
                }
              }
            }
          );
        });
      }
    });
  });
  return obj;
}

// export async function getExamples(exampleIds) {
//   const lookup_en = await getElements(sparql.LABELEN);
//   const lookup_de = await getLabels(sparql.LABELDE);
//   const codings = await getCodings(sparql.CODINGS);
//   // const descriptions = await getDescriptions( sparql.DESCRIPTIONS )
//   // const exampleIds = await getElements( sparql.EXAMPLES )
//   const list_url = [];
//   exampleIds.map((key) => {
//     var wikiurl =
//       API_URL +
//       "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
//       key;
//     list_url.push(wikiurl);
//   });
//   const wiki_res = {};
//   const asyncRes = await Promise.all(
//     list_url.map(async (url, index) => {
//       const content = await fetchWithCache(url);
//       for (let key in content.entities) {
//         wiki_res[key] = content.entities[key];
//       }
//       return;
//     })
//   );

//   let itemIds = recursiveSearch(wiki_res, "P396");
//   let items = {};
//   if (itemIds.length > 0) {
//     items = await getItems(itemIds);
//   }
//   // This is TODO for refactoring Examples Object
//   // const examples = {}
//   // for (const [key, example] of Object.entries(wiki_res)) {
//   // if (key === 'Q2934') {
//   // examples[key] = {}
//   // examples[key]['id'] = example['id'].value
//   // examples[key]['label'] = example['labels']['de'].value
//   // examples[key]['statements'] = {}
//   // }
//   // }
//   // TODO
//   const obj = {};
//   exampleIds.map((key, index) => {
//     const element = wiki_res[key];
//     // first level
//     obj[key] = {};
//     obj[key]["id"] = element["id"];
//     obj[key]["label"] = element["labels"]["de"].value;
//     // second level
//     obj[key]["statements"] = {};
//     Object.keys(element.claims).map((claim_key) => {
//       obj[key]["statements"][lookup_en[claim_key]] = {};
//       obj[key]["statements"][lookup_en[claim_key]]["id"] = claim_key;
//       obj[key]["statements"][lookup_en[claim_key]]["label"] =
//         lookup_de[claim_key];
//       if (codings[claim_key] !== undefined) {
//         obj[key]["statements"][lookup_en[claim_key]]["coding"] =
//           codings[claim_key]["coding"];
//       }
//       obj[key]["statements"][lookup_en[claim_key]]["occurrences"] = [];
//       // third level
//       element.claims[claim_key].map((occurrence, index) => {
//         if (
//           occurrence.mainsnak.snaktype === "value" &&
//           occurrence["mainsnak"]["datavalue"]["value"]["id"] !== undefined
//         ) {
//           obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index] = {
//             id: occurrence["mainsnak"]["datavalue"]["value"]["id"],
//             label:
//               lookup_de[occurrence["mainsnak"]["datavalue"]["value"]["id"]],
//           };
//         } else if (
//           occurrence["mainsnak"]["snaktype"] === "value" &&
//           occurrence["mainsnak"]["datavalue"]["value"] !== undefined
//         ) {
//           obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index] = {
//             value: occurrence["mainsnak"]["datavalue"]["value"],
//           };
//         } else {
//           obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index] = {
//             value: "",
//           };
//         }
//         // fourth level
//         if (occurrence["qualifiers"] !== undefined) {
//           obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index][
//             "qualifiers"
//           ] = {};
//           Object.keys(occurrence["qualifiers"]).map((quali_key) => {
//             obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index][
//               "qualifiers"
//             ][lookup_en[quali_key]] = {};
//             obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index][
//               "qualifiers"
//             ][lookup_en[quali_key]]["label"] = lookup_de[quali_key];
//             obj[key]["statements"][lookup_en[claim_key]]["occurrences"][index][
//               "qualifiers"
//             ][lookup_en[quali_key]]["id"] = quali_key;
//             // include coding block, if qualifier is property with coding
//             if (codings[quali_key]) {
//               obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                 index
//               ]["qualifiers"][lookup_en[quali_key]]["coding"] =
//                 codings[quali_key]["coding"];
//             }
//             // fifth level
//             occurrence["qualifiers"][quali_key].map(
//               (quali_value, quali_index) => {
//                 obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                   index
//                 ]["qualifiers"][lookup_en[quali_key]]["occurrences"] = [];
//                 if (quali_value["datatype"] === "string") {
//                   obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                     index
//                   ]["qualifiers"][lookup_en[quali_key]]["value"] =
//                     quali_value["datavalue"]["value"];
//                 }
//                 if (
//                   quali_value["datatype"] === "wikibase-item" &&
//                   quali_value["snaktype"] === "value"
//                 ) {
//                   obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                     index
//                   ]["qualifiers"][lookup_en[quali_key]]["value"] = {
//                     id: quali_value["datavalue"]["value"]["id"],
//                     label: lookup_de[quali_value["datavalue"]["value"]["id"]],
//                   };
//                 }
//                 if (
//                   quali_value["property"] === "P396" ||
//                   quali_value["property"] === "P411"
//                 ) {
//                   obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                     index
//                   ]["qualifiers"][lookup_en[quali_key]]["occurrences"][
//                     quali_index
//                   ] = items[quali_value["datavalue"]["value"]["id"]];
//                 }
//                 if (
//                   quali_value["datatype"] === "wikibase-property" &&
//                   quali_value["snaktype"] === "value"
//                 ) {
//                   let property = quali_value["datavalue"]["value"]["id"];
//                   if (codings[property]) {
//                     obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                       index
//                     ]["qualifiers"][lookup_en[quali_key]]["value"] =
//                       codings[property]["coding"];
//                   }
//                 }
//                 if (
//                   quali_value["datavalue"] &&
//                   quali_value["datavalue"]["type"] === "wikibase-entityid"
//                 ) {
//                   let property =
//                     occurrence["qualifiers"][quali_key][0]["datavalue"][
//                       "value"
//                     ]["id"];
//                   if (codings[property]) {
//                     obj[key]["statements"][lookup_en[claim_key]]["occurrences"][
//                       index
//                     ]["qualifiers"][lookup_en[quali_key]]["value"] =
//                       codings[property]["coding"];
//                   }
//                 }
//               }
//             );
//           });
//         }
//       });
//     });
//   });
//   return obj;
// }

export function sortStatements(obj) {
  // sorting statements for correct order
  // TODO refactor: use types instead
  var template = [
    // Zugeh??rigkeit innerhalb der Namensr??ume
    "P110",
    "P2",
    "P115",
    "P116",
    // Eigenschaften f??r den Namensraum DACH-Dokumentation
    "P1",
    "P4",
    "P124",
    "P379",
    "P380",
    "P401",
    "P113",
    "P109",
    "P396",
    "P397",
    "P398",
    "P402",
    "P7",
    "P3",
    "P12",
    "P8",
    "P371",
    "P389",
    "P392",
    "P393",
    "P394",
    // Eigenschaften f??r den Namensraum RDA-Dokumentation
    "P385",
    "P126",
    "P388",
    "P386",
    "P387",
    "P410",
    // Eigenschaften f??r den Namensraum GND-Datenmodell
    "P14",
    "P10",
    "P15",
    "P9",
    "P60",
    "P13",
    "P16",
    "P132",
    "P329",
    "P382",
    "P383",
    // Datenfelder
    // Idents & Codes
    "P325",
    "P326",
    "P327",
    "P53",
    "P295",
    "P63",
    "P301",
    "P108",
    "P328",
    "P332",
    "P334",
    "P333",
    "P133",
    "P101",
    "P245",
    "P344",
    "P336",
    "P340",
    "P65",
    "P339",
    // Vorzugsbenennungen
    "P58",
    "P90",
    "P391",
    "P91",
    "P93",
    "P94",
    // sonstige identifizierende Merkmale
    "P349",
    "P351",
    "P68",
    "P352",
    "P353",
    "P300",
    "P309",
    "P310",
    "P316",
    "P320",
    "P322",
    // Abweichende Benennungen
    "P59",
    "P96",
    "P95",
    "P97",
    "P99",
    "P98",
    // Beziehungen
    "P55",
    "P56",
    "P70",
    "P71",
    "P89",
    "P72",
    "P73",
    "P80",
    // Quellenangaben und unstrukturierte Beschreibungen
    "P81",
    "P358",
    "P83",
    "P84",
    "P85",
    "P86",
    "P354",
    "P355",
    // Vorzugsbenennungen in anderen Datenbest??nden
    "P107",
    "P104",
    "P105",
    "P103",
    "P106",
    // Gesch??ftsgangsdaten
    "P360",
    "P364",
    "P367",
    "P375",
    "P378",
    "P370",
    "P11", //examples
  ];
  function sortFunc(a, b) {
    let x = a[1].id;
    let y = b[1].id;
    return template.indexOf(x) - template.indexOf(y);
  }
  const sortKeys = (obj) => {
    return Object.assign(
      ...Object.entries(obj)
        .sort(sortFunc)
        .map(([key, value]) => {
          return {
            [key]: value,
          };
        })
    );
  };
  let sorted_statements = sortKeys(obj);
  return sorted_statements;
}

// const recursiveSearch = (obj, searchKey, results = []) => {
//   const r = results;
//   Object.keys(obj).forEach((key) => {
//     const value = obj[key];
//     if (key === searchKey && typeof value !== "array") {
//       value.map((obj) => {
//         if (obj["mainsnak"]) {
//           r.push(obj["mainsnak"]["datavalue"]["value"]["id"]);
//         }
//         if (obj["datavalue"]) {
//           r.push(obj["datavalue"]["value"]["id"]);
//         }
//       });
//     } else if (typeof value === "object") {
//       recursiveSearch(value, searchKey, r);
//     }
//   });
//   return r;
// };

// export async function getField(fieldId) {
//   const lookup_en = await getElements(sparql.LABELEN);
//   const lookup_de = await getLabels(sparql.LABELDE);
//   const codings = await getCodings(sparql.CODINGS);
//   const wikiurl =
//     API_URL +
//     "/w/api.php?action=wbgetentities&format=json&languages=de&ids=" +
//     fieldId;
//   const wikiapi = await fetchWithCache(wikiurl);
//   const entity = wikiapi.entities[fieldId];
//   let exampleIds = recursiveSearch(entity, "P11");
//   let examples = {};
//   if (exampleIds.length > 0) {
//     examples = await getExamples(exampleIds);
//   }
//   let itemIds = recursiveSearch(entity, "P396");
//   let items = {};
//   if (itemIds.length > 0) {
//     items = await getItems(itemIds);
//   }

//   const obj = {};
//   obj["id"] = fieldId;
//   obj["label"] = entity.labels?.de?.value ?? "";
//   obj["description"] = entity.descriptions?.de?.value ?? "";
//   obj["statements"] = {};
//   // obj['statementsdraft'] = entity.claims
//   const statements_arr = Object.keys(entity.claims);
//   statements_arr.map((key) => {
//     obj["statements"][lookup_en[key].label] = {};
//     obj["statements"][lookup_en[key].label]["id"] = key;
//     obj["statements"][lookup_en[key].label]["label"] = lookup_de[key];
//     if (key === "P4") {
//       // integrate coding from codings api
//       obj["statements"][lookup_en[key].label]["format"] = {};
//       obj["statements"][lookup_en[key].label]["format"] =
//         codings[fieldId]["coding"]["format"];
//     }
//     obj["statements"][lookup_en[key].label]["occurrences"] = [];
//     const occurrences_arr = entity.claims[key];
//     occurrences_arr.map((occurrences, index) => {
//       const occurrences_id =
//         occurrences["mainsnak"]["datavalue"]["value"]["id"];
//       if (occurrences_id) {
//         obj["statements"][lookup_en[key].label]["occurrences"][index] = {
//           id: occurrences_id,
//           label: lookup_de[occurrences_id],
//         };
//       } else {
//         obj["statements"][lookup_en[key].label]["occurrences"][index] = {
//           value: occurrences["mainsnak"]["datavalue"]["value"],
//         };
//       }
//       if (key === "P15") {
//         // integrate coding in subfields (P15) object
//         obj["statements"][lookup_en[key].label]["occurrences"][index][
//           "coding"
//         ] = codings[occurrences_id]["coding"];
//       }
//       if (key === "P11") {
//         // integrate examples (P11) object if available
//         obj["statements"][lookup_en[key].label]["occurrences"][index][
//           "statements"
//         ] = examples[occurrences_id]["statements"];
//       }
//       const qualifiers = occurrences["qualifiers"];
//       if (qualifiers) {
//         obj["statements"][lookup_en[key].label]["occurrences"][index][
//           "qualifiers"
//         ] = {};
//         const qualifiers_arr = Object.keys(occurrences["qualifiers"]);
//         qualifiers_arr.map((quali_key, quali_index) => {
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[quali_key].label] = {};
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[quali_key].label]["label"] = lookup_de[quali_key];
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[quali_key].label]["id"] = quali_key;
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "qualifiers"
//           ][lookup_en[quali_key].label]["occurrences"] = [];
//           const occurrences_arr2 = qualifiers[quali_key];
//           occurrences_arr2.map((occurrences2, index2) => {
//             let occurrences2_id = undefined;
//             if (occurrences2["datavalue"] !== undefined) {
//               occurrences2_id = occurrences2["datavalue"]["value"]["id"];
//               if (occurrences2_id) {
//                 obj["statements"][lookup_en[key].label]["occurrences"][index][
//                   "qualifiers"
//                 ][lookup_en[quali_key].label]["occurrences"][index2] = {};
//                 obj["statements"][lookup_en[key].label]["occurrences"][index][
//                   "qualifiers"
//                 ][lookup_en[quali_key].label]["occurrences"][index2]["id"] =
//                   occurrences2_id;
//                 obj["statements"][lookup_en[key].label]["occurrences"][index][
//                   "qualifiers"
//                 ][lookup_en[quali_key].label]["occurrences"][index2]["label"] =
//                   lookup_de[occurrences2_id];
//                 if (quali_key === "P396") {
//                   obj["statements"][lookup_en[key].label]["occurrences"][index][
//                     "qualifiers"
//                   ][lookup_en[quali_key].label]["occurrences"][index2][
//                     "statements"
//                   ] = items[occurrences2_id]["statements"];
//                 }
//                 if (quali_key === "P11") {
//                   obj["statements"][lookup_en[key].label]["occurrences"][index][
//                     "qualifiers"
//                   ][lookup_en[quali_key].label]["occurrences"][index2][
//                     "statements"
//                   ] = examples[occurrences2_id]["statements"];
//                 }
//               } else {
//                 obj["statements"][lookup_en[key].label]["occurrences"][index][
//                   "qualifiers"
//                 ][lookup_en[quali_key].label]["occurrences"][index2] = {
//                   value: occurrences2["datavalue"]["value"],
//                 };
//               }
//             }
//           });
//         });
//       }
//       const reference_arr = occurrences["references"];
//       if (reference_arr) {
//         obj["statements"][lookup_en[key].label]["occurrences"][index][
//           "references"
//         ] = [];
//         reference_arr.map((reference, ref_index) => {
//           const ref_keys = Object.keys(reference["snaks"]);
//           const ref_obj = {};
//           ref_keys.map((ref_key) => {
//             const ref = {
//               id: ref_key,
//               label: lookup_de[ref_key],
//               value: reference["snaks"][ref_key][0]["datavalue"]["value"],
//             };
//             ref_obj[lookup_en[ref_key].label] = ref;
//           });
//           obj["statements"][lookup_en[key].label]["occurrences"][index][
//             "references"
//           ][ref_index] = ref_obj;
//         });
//       }
//     });
//   });
//   return obj;
// }
