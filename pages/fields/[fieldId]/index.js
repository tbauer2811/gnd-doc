import fetchWithCache from '../../api/fetchWithCache.js'
import * as constants from '../../../sparql/queryConstants'
import queryElements from '../../../sparql/queryElements'
import queryField from '../../../wikibase/queryField'
import FieldDetail from '../../../components/fields/FieldDetail'

function FieldDetails(props) {
  // console.log('test', props.test)
  const field = props.field
  console.log('field', field)
  // console.log('api_data', props.api_data)
  return(
    <FieldDetail data={props.field}/>
  )
}

export default FieldDetails

export async function getStaticPaths() {
  // const res = await fetch('http://localhost:3000/api/fields')
  // const fields = await res.json()
  const fields = await queryElements( constants.QUERYFIELDS )
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
  // fetch data for a single field
  const fieldId = context.params.fieldId
  // const api_url = 'http://localhost:3000/api/fields/'
  // const api_url = 'http://10.69.59.78:3000/api/field/'

  // const api_res = await fetch(api_url + fieldId)
  // const field = await api_res.json()
  const field = await queryField(fieldId)

  return {
    props: {
      field: field
    },
    revalidate: 10
  }

}
