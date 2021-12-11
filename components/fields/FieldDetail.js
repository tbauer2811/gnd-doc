import { Fragment } from 'react';
import CodingTable from '../tables/CodingTable.js';
import classes from './FieldDetail.module.css';

function FieldDetail(props) {
        // console.log(props)
        const field = props.data
        const coding_columns = []
        const coding_rows = []
        field.statements.coding.occurrences.map((occurrence,index) => {
                // console.log(occurrence.qualifiers.type.occurrences[0])
                coding_columns[index] = occurrence.qualifiers.type.occurrences[0].label
                coding_rows[index] = occurrence.value
        })

        return (
                <>
                <title>{field.label}</title>
                <section className={classes.detail}>
                <h1>{field.label}</h1>
                <p>{field.description}</p>
                <h3>{field.statements.coding.label}</h3>
                        <CodingTable rows={coding_rows} columns={coding_columns}/>
                <h3>{field.statements.definition.label}</h3>
                {field.statements.definition.occurrences.map((occurrence,index) => {
                        return(
                                <p key={index}>{occurrence.value}</p>
                        )
                })}
                <h3>{field.statements.rulesofuse.label}</h3>
                {field.statements.rulesofuse.occurrences.map((occurrence,index) => {
                        return(
                                <p key={index}>{occurrence.value}</p>
                        )
                })}
                <h3>{field.statements.validation.label}</h3>
                {field.statements.validation.occurrences.map((occurrence,index) => {
                        return(
                                <p key={index}>{occurrence.value}</p>
                        )
                })}
                <h3>{field.statements.subfields.label}</h3>
                {field.statements.subfields.occurrences.map((subfield,index) => {
                        console.log(subfield)
                        return(
                                <h4 key={index}>{subfield.label}</h4>
                        )
                })}
                </section>
                </>
        )
}

export default FieldDetail
