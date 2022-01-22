import FieldDetail from '../../../components/fields/FieldDetail'

function FieldDetails(props) {
        const field = props.field
        console.log('field', field)
        // console.log('api_data', props.api_data)
        return(
                <FieldDetail data={props.field}/>
        )
}

export default FieldDetails

export async function getStaticPaths() {
        //fetch data from API 
        // const res = await fetch('https://doku.wikibase.wiki/w/rest.php/gnd/doku/v1/datafields')
        // const data = await res.json()
        const res = await fetch('http://localhost:3000/api/fields')
        const data = await res.json()
        const fields = data
        const rows = []
        Object.keys(fields).map(key => {
                rows.push(key)
                // console.log('rows',rows)
        })

        return {
                fallback: false,
                paths: rows.map((id) => ({
                        params: { fieldId: id.toString() }
                }))
        }
    
}

export async function getStaticProps(context) {
        //fetch data for a single field
        const fieldId = context.params.fieldId
        const api_url = 'http://localhost:3000/api/fields/'
        // const api_url = 'http://10.69.59.78:3000/api/field/'

        const api_res = await fetch(api_url + fieldId)
        const field = await api_res.json()

        // const res = await fetch('https://doku.wikibase.wiki/w/rest.php/gnd/doku/v1/datafields')
        // const data = await res.json()
        // const fields = data.fields
        // const rows = []
        // Object.keys(fields).map(key => {
                // // every field needs a Property ID
                // fields[key]['id'] = key
                // rows.push(fields[key])
                // // console.log('rows',rows)
                // // console.log(fields[key])
                // // console.log('key',key)
        // })
        // const field = rows.filter(field => field.id === fieldId)

        return {
                props: {
                        // meetups: DUMMY_MEETUPS,
                        // field: field[0],
                        field: field
                },
                revalidate: 10
        }

}
