package humanize

import (
	"fmt"
	"math"
	"time"
)

const (
	Day   = 24 * time.Hour
	Week  = 7 * Day
	Month = 30 * Day
	Year  = 12 * Month
)

// DurationFormat describe how duration should be
// displayed up to a certain value.
type DurationFormat struct {
	Format string
	DivBy  time.Duration
	UpTo   time.Duration
}

var defaultDurations = []DurationFormat{
	{"now", 0, time.Second},
	{"1 second", 0, time.Second * 2},
	{"%d seconds", time.Second, time.Minute},
	{"1 minute", 0, 2 * time.Minute},
	{"%d minutes", time.Minute, time.Hour},
	{"1 hour", 0, 2 * time.Hour},
	{"%d hours", time.Hour, Day},
	{"1 day", 0, 2 * Day},
	{"%d days", Day, Week},
	{"1 week", 0, 2 * Week},
	{"%d weeks", Week, Month},
	{"1 month", 0, 2 * Month},
	{"%d months", Month, Year},
	{"1 year", 0, 18 * Month},
	{"2 years", 0, 2 * Year},
	{"%d years", Year, math.MaxInt64},
}

func DisplayDuration(duration time.Duration, formats []DurationFormat) string {

	if formats == nil {
		formats = defaultDurations
	}

	str := ""

	for _, f := range formats {
		if f.UpTo <= duration {
			continue
		}
		if f.DivBy == 0 { // no need to divide
			str = f.Format
		} else {
			str = fmt.Sprintf(f.Format, duration/f.DivBy)
		}
		break
	}

	return str
}
