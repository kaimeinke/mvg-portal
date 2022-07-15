import React, { ReactElement, useEffect, useRef, useState } from 'react'
import styles from './SectionQuotes.module.css'
import { graphql, useStaticQuery } from 'gatsby'
import { nanoid } from 'nanoid'
import classNames from 'classnames/bind'
import Container from '../atoms/Container'

const cx = classNames.bind(styles)

const query = graphql`
  query QuotesQuery {
    file(relativePath: { eq: "quotes.json" }) {
      childContentJson {
        title
        quotes {
          name
          profilePicture {
            childImageSharp {
              original {
                src
              }
            }
          }
          quote
        }
      }
    }
  }
`
interface QuotesContentData {
  file: {
    childContentJson: {
      title: string
      quotes: {
        name: string
        profilePicture: {
          childImageSharp: { original: { src: string } }
        }
        quote: string
      }[]
    }
  }
}

interface Quote {
  id: string
  name: string
  profilePicture: string
  quote: string
}

export default function SectionQuotes(): ReactElement {
  const data: QuotesContentData = useStaticQuery(query)
  const { title } = data.file.childContentJson
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [currentQuote, setCurrentQuote] = useState(0)

  const currentQuoteRef = useRef(currentQuote)
  currentQuoteRef.current = currentQuote

  const nextQuoteTimer = useRef(null)

  useEffect(() => {
    if (!data) return
    setQuotes(
      data.file.childContentJson.quotes.map((quote) => ({
        ...quote,
        id: nanoid(),
        profilePicture: quote.profilePicture.childImageSharp.original.src
      }))
    )
  }, [data])

  useEffect(() => {
    if (nextQuoteTimer) clearTimeout(nextQuoteTimer.current)
    nextQuoteTimer.current = setTimeout(() => {
      setCurrentQuote((currentQuoteRef.current + 1) % quotes.length)
    }, 5000)

    return () => {
      clearTimeout(nextQuoteTimer.current)
    }
  }, [quotes, currentQuote])

  return (
    <Container>
      <div className={styles.container}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <div className={styles.images}>
          {quotes.map((e, i) => (
            <img
              key={e.id}
              className={cx({
                profilePicture: true,
                active: e.id === quotes?.[currentQuote].id
              })}
              alt={`Profile picture ${e.name}`}
              src={e.profilePicture}
              onClick={() => setCurrentQuote(i)}
            />
          ))}
        </div>
        <div className={styles.quote}>
          <h3 className={styles.text}>{`“${quotes[currentQuote]?.quote}”`}</h3>
          <p className={styles.name}>{quotes[currentQuote]?.name}</p>
        </div>
      </div>
    </Container>
  )
}